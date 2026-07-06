import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { User, LoginCredentials, RegisterData } from "../types";
import { apiFetch, refreshAuth, tokenStore, type AuthPayload } from "../lib/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

function mapAuthResponseToUser(data: AuthPayload): User {
  return {
    id: data.userId,
    name: data.name,
    email: data.email,
    role: data.role?.toLowerCase() === "admin" ? "admin" : "member",
    plan: data.plan,
    joinDate: new Date().toISOString(),
    booksRead: 0,
    currentBooks: [],
  };
}

/** Cached identity for instant paint; the silent refresh confirms or clears it. */
function cachedUser(): User | null {
  const stored = localStorage.getItem("user");
  if (!stored) return null;
  try {
    return JSON.parse(stored) as User;
  } catch {
    localStorage.removeItem("user");
    return null;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(cachedUser);
  const [isLoading, setIsLoading] = useState(() => cachedUser() !== null);
  const booted = useRef(false);

  // Boot: the access token lives in memory only, so rotate the httpOnly
  // refresh cookie into a fresh session. No cookie -> logged out.
  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    if (!localStorage.getItem("user")) return;

    refreshAuth()
      .then((payload) => {
        if (payload) {
          const nextUser = mapAuthResponseToUser(payload);
          setUser(nextUser);
          localStorage.setItem("user", JSON.stringify(nextUser));
        } else {
          setUser(null);
          tokenStore.clear();
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const authenticate = async (path: string, body: unknown): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await apiFetch<AuthPayload>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      tokenStore.setAccess(data.accessToken);
      const nextUser = mapAuthResponseToUser(data);
      setUser(nextUser);
      localStorage.setItem("user", JSON.stringify(nextUser));
    } finally {
      setIsLoading(false);
    }
  };

  const login = (credentials: LoginCredentials) => authenticate("/auth/login", credentials);

  const register = (data: RegisterData) => {
    const [firstName, ...rest] = data.name.trim().split(" ");
    return authenticate("/auth/register", {
      firstName,
      lastName: rest.join(" ") || "",
      email: data.email,
      password: data.password,
      phone: data.phone || undefined,
      address: data.address || undefined,
    });
  };

  const logout = () => {
    // Revokes the refresh-token family server-side and clears the cookie
    apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    setUser(null);
    tokenStore.clear();
  };

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    if (!user) return;
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
