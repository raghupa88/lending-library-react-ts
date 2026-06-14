import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { User, LoginCredentials, RegisterData } from "../types";
import { apiFetch } from "../lib/api";

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

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthApiResponse {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  accessToken: string;
  refreshToken: string;
}

function mapAuthResponseToUser(data: AuthApiResponse): User {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
    role: data.role === "admin" ? "admin" : "member",
    plan: data.plan,
    joinDate: new Date().toISOString(),
    booksRead: 0,
    currentBooks: [],
  };
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // SSR-safe: localStorage is only accessed inside useEffect,
  // which never runs during server-side renderToString.
  useEffect(() => {
    // Restore session from localStorage if token and user exist
    const storedUser = localStorage.getItem("user");
    const token = localStorage.getItem("access_token");
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (credentials: LoginCredentials): Promise<void> => {
    setIsLoading(true);
    try {
      const res = await apiFetch<AuthApiResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(credentials),
      });

      if (!res.success || !res.data) {
        throw new Error(res.error ?? "Invalid credentials");
      }

      const { accessToken, refreshToken, ...rest } = res.data;
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);

      const loggedInUser = mapAuthResponseToUser({ ...rest, accessToken, refreshToken });
      setUser(loggedInUser);
      localStorage.setItem("user", JSON.stringify(loggedInUser));
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: RegisterData): Promise<void> => {
    setIsLoading(true);
    try {
      const [firstName, ...rest] = data.name.trim().split(" ");
      const lastName = rest.join(" ") || "";

      const res = await apiFetch<AuthApiResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          firstName,
          lastName,
          email: data.email,
          password: data.password,
        }),
      });

      if (!res.success || !res.data) {
        throw new Error(res.error ?? "Registration failed");
      }

      const { accessToken, refreshToken, ...rest2 } = res.data;
      localStorage.setItem("access_token", accessToken);
      localStorage.setItem("refresh_token", refreshToken);

      const newUser = mapAuthResponseToUser({ ...rest2, accessToken, refreshToken });
      setUser(newUser);
      localStorage.setItem("user", JSON.stringify(newUser));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    // Best-effort server-side logout; ignore errors
    const token = localStorage.getItem("access_token");
    if (token) {
      apiFetch("/auth/logout", { method: "POST" }).catch(() => {});
    }
    setUser(null);
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("user");
  };

  const updateProfile = async (data: Partial<User>): Promise<void> => {
    if (!user) return;
    const updatedUser = { ...user, ...data };
    setUser(updatedUser);
    localStorage.setItem("user", JSON.stringify(updatedUser));
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
