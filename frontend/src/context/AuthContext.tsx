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
  useMemo,
  ReactNode,
} from "react";
import { authAPI } from "../api";
import { refreshAccessToken, setAccessToken } from "../api/axios";
import toast from "react-hot-toast";
import type { IUser, IRegisterData } from "../types";
import { setAnalyticsUser } from "../utils/analytics";

// Types
// `status` is the HTTP status of a failed request (undefined when offline)
export type AuthResult = { success: boolean; user?: IUser; error?: string; status?: number };

export type GoogleAuthResult = AuthResult & {
  isNewUser?: boolean;
  // An unverified password on this email was removed when Google was linked
  passwordRemoved?: boolean;
};

interface AuthContextType {
  user: IUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  register: (data: IRegisterData) => Promise<AuthResult>;
  login: (email: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: (idToken: string) => Promise<GoogleAuthResult>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<IUser>) => void;
}

interface AuthProviderProps {
  children: ReactNode;
}

interface ApiError {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

const AuthContext = createContext<AuthContextType | null>(null);

// Hook lives next to its provider; only affects Fast Refresh granularity in dev
// eslint-disable-next-line react-refresh/only-export-components
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

  // A device an admin signs in on is no longer counted in the Visitors stats
  useEffect(() => setAnalyticsUser(user), [user]);

  // Restore the session on mount: the httpOnly refresh cookie (if any) is
  // exchanged for an in-memory access token
  useEffect(() => {
    const initAuth = async (): Promise<void> => {
      // Tokens used to be kept in localStorage; drop any left from older versions
      try {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
      } catch {
        // storage unavailable - nothing to clean up
      }

      const token = await refreshAccessToken();
      if (token) {
        try {
          const response = await authAPI.getMe();
          setUser(response.data.user);
          setIsAuthenticated(true);
        } catch (error) {
          setAccessToken(null);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Failures are returned (not toasted): every form shows them inline

  // Register
  const register = useCallback(
    async (data: IRegisterData): Promise<AuthResult> => {
      try {
        const response = await authAPI.register(data);
        const { user, accessToken } = response.data;

        setAccessToken(accessToken);

        setUser(user);
        setIsAuthenticated(true);
        toast.success("Registration successful!");

        return { success: true, user };
      } catch (error: unknown) {
        const err = error as ApiError;
        const message = err.response?.data?.message || "Registration failed";
        return { success: false, error: message, status: err.response?.status };
      }
    },
    [],
  );

  // Login
  const login = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const response = await authAPI.login(email, password);
        const { user, accessToken } = response.data;

        setAccessToken(accessToken);

        setUser(user);
        setIsAuthenticated(true);
        toast.success("Login successful!");

        return { success: true, user };
      } catch (error: unknown) {
        const err = error as ApiError;
        const message = err.response?.data?.message || "Invalid credentials";
        return { success: false, error: message, status: err.response?.status };
      }
    },
    [],
  );

  // Sign in or sign up with a Google ID token
  const loginWithGoogle = useCallback(
    async (idToken: string): Promise<GoogleAuthResult> => {
      try {
        const response = await authAPI.google(idToken);
        const { user, accessToken, isNewUser, passwordRemoved } = response.data;

        setAccessToken(accessToken);

        setUser(user);
        setIsAuthenticated(true);
        toast.success(isNewUser ? "Welcome to Nevan!" : "Login successful!");

        return { success: true, user, isNewUser, passwordRemoved };
      } catch (error: unknown) {
        const err = error as ApiError;
        const message = err.response?.data?.message || "Google sign-in failed";
        return { success: false, error: message, status: err.response?.status };
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

    setAccessToken(null);
    setUser(null);
    setIsAuthenticated(false);
    toast.success("Logged out successfully");
  }, []);

  // Update user profile locally
  const updateUser = useCallback((updates: Partial<IUser>): void => {
    setUser((prev) => (prev ? { ...prev, ...updates } : null));
  }, []);

  // Memoize isAdmin to avoid recalculation
  const isAdmin = useMemo(() => user?.role === "admin", [user?.role]);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      isAuthenticated,
      isAdmin,
      register,
      login,
      loginWithGoogle,
      logout,
      updateUser,
    }),
    [
      user,
      loading,
      isAuthenticated,
      isAdmin,
      register,
      login,
      loginWithGoogle,
      logout,
      updateUser,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
