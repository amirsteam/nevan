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
import type {
  IUser,
  IRegisterData,
  IAuthResponse,
  ITwoFactorChallenge,
  ITwoFactorPendingResponse,
  ITwoFactorSetup,
} from "../types";
import { setAnalyticsUser } from "../utils/analytics";

// Types
// `status` is the HTTP status of a failed request (undefined when offline).
// `twoFactor`: the password was right but this admin must finish two-step login
// (the sign-in page shows that step; it isn't an error).
export type AuthResult = {
  success: boolean;
  user?: IUser;
  error?: string;
  status?: number;
  twoFactor?: ITwoFactorChallenge;
};

/** Setup finished: show the backup codes, then call finish() to enter the account */
export type TwoFactorEnabled = { backupCodes: string[]; finish: () => void };

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
  /** An admin sign-in waiting for its authenticator step */
  twoFactorChallenge: ITwoFactorChallenge | null;
  cancelTwoFactor: () => void;
  /** Finish the sign-in with a code from the app, or a backup code */
  verifyTwoFactor: (input: { code?: string; backupCode?: string; rememberDevice: boolean }) => Promise<AuthResult>;
  /** First sign-in: the new authenticator to scan (throws on failure) */
  startTwoFactorSetup: () => Promise<ITwoFactorSetup>;
  /** Its first code: two-step login on; signed in once finish() is called */
  enableTwoFactor: (code: string, rememberDevice: boolean) => Promise<TwoFactorEnabled>;
}

/** The server's answer to a password/Google sign-in: a session, or the two-step step */
const challengeFrom = (data: IAuthResponse | ITwoFactorPendingResponse): ITwoFactorChallenge | null => {
  if (!("challengeToken" in data) || !data.challengeToken) return null;
  return { purpose: data.twoFactorSetupRequired ? "setup" : "verify", challengeToken: data.challengeToken };
};

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
  const [twoFactorChallenge, setTwoFactorChallenge] = useState<ITwoFactorChallenge | null>(null);

  const startSession = useCallback((user: IUser, accessToken: string) => {
    setAccessToken(accessToken);
    setUser(user);
    setIsAuthenticated(true);
    setTwoFactorChallenge(null);
  }, []);

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
        const twoFactor = challengeFrom(response.data);
        if (twoFactor) {
          setTwoFactorChallenge(twoFactor);
          return { success: false, twoFactor };
        }
        const { user, accessToken } = response.data as IAuthResponse;

        startSession(user, accessToken);
        toast.success("Login successful!");

        return { success: true, user };
      } catch (error: unknown) {
        const err = error as ApiError;
        const message = err.response?.data?.message || "Invalid credentials";
        return { success: false, error: message, status: err.response?.status };
      }
    },
    [startSession],
  );

  // Sign in or sign up with a Google ID token
  const loginWithGoogle = useCallback(
    async (idToken: string): Promise<GoogleAuthResult> => {
      try {
        const response = await authAPI.google(idToken);
        const twoFactor = challengeFrom(response.data);
        if (twoFactor) {
          setTwoFactorChallenge(twoFactor);
          return { success: false, twoFactor };
        }
        const { user, accessToken, isNewUser, passwordRemoved } = response.data as IAuthResponse;

        startSession(user, accessToken);
        toast.success(isNewUser ? "Welcome to Nevan!" : "Login successful!");

        return { success: true, user, isNewUser, passwordRemoved };
      } catch (error: unknown) {
        const err = error as ApiError;
        const message = err.response?.data?.message || "Google sign-in failed";
        return { success: false, error: message, status: err.response?.status };
      }
    },
    [startSession],
  );

  // ---------- Two-step login (admins) ----------

  const cancelTwoFactor = useCallback(() => setTwoFactorChallenge(null), []);

  // An expired sign-in (401) goes back to the password step
  const expireChallenge = useCallback((status?: number) => {
    if (status === 401) setTwoFactorChallenge(null);
  }, []);

  const verifyTwoFactor = useCallback(
    async (input: { code?: string; backupCode?: string; rememberDevice: boolean }): Promise<AuthResult> => {
      if (!twoFactorChallenge) return { success: false, error: "Enter your email and password again." };
      try {
        const response = await authAPI.verifyTwoFactor({
          challengeToken: twoFactorChallenge.challengeToken,
          ...input,
        });
        const { user, accessToken, backupCodesLeft } = response.data;
        startSession(user, accessToken);
        toast.success("Login successful!");
        if (input.backupCode && typeof backupCodesLeft === "number" && backupCodesLeft <= 3) {
          toast(
            `Only ${backupCodesLeft} backup code${backupCodesLeft === 1 ? "" : "s"} left. Make new ones in Profile → Security.`,
            { duration: 8000 },
          );
        }
        return { success: true, user };
      } catch (error: unknown) {
        const err = error as ApiError;
        expireChallenge(err.response?.status);
        const message = err.response?.data?.message || "That code didn't work. Please try again.";
        return { success: false, error: message, status: err.response?.status };
      }
    },
    [twoFactorChallenge, startSession, expireChallenge],
  );

  const startTwoFactorSetup = useCallback(async (): Promise<ITwoFactorSetup> => {
    if (!twoFactorChallenge) throw new Error("Enter your email and password again.");
    try {
      const response = await authAPI.setupTwoFactor(twoFactorChallenge.challengeToken);
      return response.data;
    } catch (error) {
      expireChallenge((error as ApiError).response?.status);
      throw error;
    }
  }, [twoFactorChallenge, expireChallenge]);

  const enableTwoFactor = useCallback(
    async (code: string, rememberDevice: boolean): Promise<TwoFactorEnabled> => {
      if (!twoFactorChallenge) throw new Error("Enter your email and password again.");
      try {
        const response = await authAPI.enableTwoFactor({
          challengeToken: twoFactorChallenge.challengeToken,
          code,
          rememberDevice,
        });
        const { user, accessToken, backupCodes = [] } = response.data;
        // Signed in only after the backup codes have been seen (the sign-in page
        // leaves as soon as the account is signed in)
        return {
          backupCodes,
          finish: () => {
            startSession(user, accessToken);
            toast.success("Two-step login is on");
          },
        };
      } catch (error) {
        expireChallenge((error as ApiError).response?.status);
        throw error;
      }
    },
    [twoFactorChallenge, startSession, expireChallenge],
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
    setTwoFactorChallenge(null);
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
      twoFactorChallenge,
      cancelTwoFactor,
      verifyTwoFactor,
      startTwoFactorSetup,
      enableTwoFactor,
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
      twoFactorChallenge,
      cancelTwoFactor,
      verifyTwoFactor,
      startTwoFactorSetup,
      enableTwoFactor,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext;
