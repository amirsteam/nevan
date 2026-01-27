/**
 * Auth Context
 * Manages authentication state across the application
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { authAPI } from "../api";
import toast from "react-hot-toast";
import type { IUser, IRegisterData } from "@shared/types";

// Types
interface AuthContextType {
  user: IUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  register: (
    data: IRegisterData,
  ) => Promise<{ success: boolean; user?: IUser; error?: string }>;
  login: (
    email: string,
    password: string,
  ) => Promise<{ success: boolean; user?: IUser; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<IUser>) => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({
  children,
}: AuthProviderProps): React.ReactElement => {
  const [user, setUser] = useState<IUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  // Check authentication on mount
  useEffect(() => {
    const initAuth = async (): Promise<void> => {
      const token = localStorage.getItem("accessToken");
      if (token) {
        try {
          const response = await authAPI.getMe();
          setUser(response.data.user);
          setIsAuthenticated(true);
        } catch (error) {
          // Token invalid - clear storage
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Register
  const register = useCallback(
    async (
      data: IRegisterData,
    ): Promise<{ success: boolean; user?: IUser; error?: string }> => {
      try {
        const response = await authAPI.register(data);
        const { user, accessToken, refreshToken } = response.data;

        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);

        setUser(user);
        setIsAuthenticated(true);
        toast.success("Registration successful!");

        return { success: true, user };
      } catch (error: unknown) {
        const err = error as ApiError;
        const message = err.response?.data?.message || "Registration failed";
        toast.error(message);
        return { success: false, error: message };
      }
    },
    [],
  );

  // Login
  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{ success: boolean; user?: IUser; error?: string }> => {
      try {
        const response = await authAPI.login(email, password);
        const { user, accessToken, refreshToken } = response.data;

        localStorage.setItem("accessToken", accessToken);
        localStorage.setItem("refreshToken", refreshToken);

        setUser(user);
        setIsAuthenticated(true);
        toast.success("Login successful!");

        return { success: true, user };
      } catch (error: unknown) {
        const err = error as ApiError;
        const message = err.response?.data?.message || "Invalid credentials";
        toast.error(message);
        return { success: false, error: message };
      }
    },
    [],
  );

  // Logout
  const logout = useCallback(async (): Promise<void> => {
    try {
      await authAPI.logout();
    } catch (error) {
      // Ignore logout errors
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    setUser(null);
    setIsAuthenticated(false);
    toast.success("Logged out successfully");
  }, []);

  // Update user profile locally
  const updateUser = useCallback((updates: Partial<IUser>): void => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated,
    isAdmin: user?.role === "admin",
    register,
    login,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
