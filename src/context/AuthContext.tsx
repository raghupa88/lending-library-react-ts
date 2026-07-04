import { createContext, useContext, useState, type ReactNode } from "react";
import { User, LoginCredentials, RegisterData } from "../types";
import { apiFetch, tokenStore } from "../lib/api";

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

/** Matches backend AuthResponse (backend/.../api/dto/AuthResponse.java). */
interface AuthApiResponse {
  userId: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  accessToken: string;
  refreshToken: string;
}

function mapAuthResponseToUser(data: AuthApiResponse): User {
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

function restoreSession(): User | null {
  const storedUser = localStorage.getItem("user");
  if (!storedUser || !tokenStore.getAccess()) return null;
  try {
    return JSON.parse(storedUser) as User;
  } catch {
    tokenStore.clear();
    return null;
  }
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(restoreSession);
  const [isLoading, setIsLoading] = useState(false);

  const authenticate = async (path: string, body: unknown): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await apiFetch<AuthApiResponse>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      tokenStore.set(data.accessToken, data.refreshToken);
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
    });
  };

  const logout = () => {
    // Best-effort server-side logout; ignore errors
    if (tokenStore.getAccess()) {
      apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    }
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
