import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { authAPI } from "../api/auth";
import { getItem, setItem, deleteItem } from "../utils/storage";
import socketService from "../services/socketService";
import { clearChat } from "./chatSlice";
import {
  unregisterPushToken,
  getExpoPushToken,
} from "../services/notificationService";
import { signOutOfGoogle } from "../services/googleSignIn";
import type { IUser, IRegisterData } from "@shared/types";

// Types
interface AuthState {
  user: IUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  checked: boolean;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AuthPayload {
  user: IUser;
  accessToken: string;
}

interface GoogleAuthPayload extends AuthPayload {
  isNewUser?: boolean;
  // An unverified password on this email was removed when Google was linked
  passwordRemoved?: boolean;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

// The last signed-in profile, so the app opens signed in while offline.
// Only small fields are kept (secure storage values should stay under 2 KB).
const CACHED_USER_KEY = "user";

const cacheUser = async (user: IUser): Promise<void> => {
  const { _id, name, email, phone, role, isActive, hasPassword, emailVerified, googleLinked, createdAt, updatedAt } = user;
  try {
    await setItem(
      CACHED_USER_KEY,
      JSON.stringify({ _id, name, email, phone, role, isActive, hasPassword, emailVerified, googleLinked, createdAt, updatedAt }),
    );
  } catch {
    // Caching is best-effort
  }
};

const getCachedUser = async (): Promise<IUser | null> => {
  try {
    const raw = await getItem(CACHED_USER_KEY);
    return raw ? (JSON.parse(raw) as IUser) : null;
  } catch {
    return null;
  }
};

const startSession = async (accessToken: string, refreshToken: string, user: IUser) => {
  await setItem("accessToken", accessToken);
  await setItem("refreshToken", refreshToken);
  await cacheUser(user);
};

const clearSession = async () => {
  await deleteItem("accessToken");
  await deleteItem("refreshToken");
  await deleteItem(CACHED_USER_KEY);
};

// Async thunks
export const login = createAsyncThunk<
  AuthPayload,
  LoginCredentials,
  { rejectValue: string }
>("auth/login", async ({ email, password }, { rejectWithValue }) => {
  try {
    const response = await authAPI.login(email, password);
    const { accessToken, refreshToken, user } = response.data;

    await startSession(accessToken, refreshToken, user);

    return { user, accessToken };
  } catch (error: unknown) {
    const err = error as ApiError;
    return rejectWithValue(err.response?.data?.message || "Login failed");
  }
});

export const register = createAsyncThunk<
  AuthPayload,
  IRegisterData,
  { rejectValue: string }
>("auth/register", async (userData, { rejectWithValue }) => {
  try {
    const response = await authAPI.register(userData);
    const { accessToken, refreshToken, user } = response.data;

    await startSession(accessToken, refreshToken, user);

    return { user, accessToken };
  } catch (error: unknown) {
    const err = error as ApiError;
    return rejectWithValue(
      err.response?.data?.message || "Registration failed",
    );
  }
});

// Takes the ID token from services/googleSignIn (the button handles the Google picker)
export const googleLogin = createAsyncThunk<
  GoogleAuthPayload,
  string,
  { rejectValue: string }
>("auth/googleLogin", async (idToken, { rejectWithValue }) => {
  try {
    const response = await authAPI.google(idToken);
    const { accessToken, refreshToken, user, isNewUser, passwordRemoved } = response.data;

    await startSession(accessToken, refreshToken, user);

    return { user, accessToken, isNewUser, passwordRemoved };
  } catch (error: unknown) {
    const err = error as ApiError;
    await signOutOfGoogle(); // let them pick another account next time
    return rejectWithValue(err.response?.data?.message || "Google sign-in failed");
  }
});

export const logout = createAsyncThunk<void, void, { rejectValue: string }>(
  "auth/logout",
  async (_, { dispatch }) => {
    try {
      // Unregister push token BEFORE deleting auth tokens
      // so the API call can still authenticate
      const pushToken = await getExpoPushToken();
      if (pushToken) {
        await unregisterPushToken(pushToken).catch(() => {});
      }
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error", error);
    } finally {
      socketService.disconnect();
      dispatch(clearChat());
      await signOutOfGoogle();
      await clearSession();
    }
  },
);

export const checkAuth = createAsyncThunk<
  { user: IUser },
  void,
  { rejectValue: string }
>("auth/checkAuth", async (_, { rejectWithValue }) => {
  const [accessToken, refreshToken] = await Promise.all([
    getItem("accessToken"),
    getItem("refreshToken"),
  ]);
  if (!accessToken && !refreshToken) {
    return rejectWithValue("No token found");
  }

  try {
    // A 401 here is retried after a token refresh by the axios interceptor
    const response = await authAPI.getMe();
    await cacheUser(response.data.user);
    return { user: response.data.user };
  } catch (error: unknown) {
    const err = error as ApiError;

    // The refresh token is only deleted when the server rejected it: the session is over
    if (!(await getItem("refreshToken"))) {
      await clearSession();
      return rejectWithValue(err.response?.data?.message || "Session expired");
    }

    // Offline or the server is having trouble: stay signed in with the last known profile
    const cachedUser = await getCachedUser();
    if (cachedUser) return { user: cachedUser };
    return rejectWithValue("Couldn't reach the server");
  }
});

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  checked: false,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action: PayloadAction<AuthPayload>) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Login failed";
      })
      // Register
      .addCase(register.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(
        register.fulfilled,
        (state, action: PayloadAction<AuthPayload>) => {
          state.loading = false;
          state.isAuthenticated = true;
          state.user = action.payload.user;
        },
      )
      .addCase(register.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Registration failed";
      })
      // Google
      .addCase(googleLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(googleLogin.fulfilled, (state, action: PayloadAction<GoogleAuthPayload>) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
      })
      .addCase(googleLogin.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Google sign-in failed";
      })
      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      })
      // Check Auth
      .addCase(checkAuth.pending, (state) => {
        state.loading = true;
      })
      .addCase(
        checkAuth.fulfilled,
        (state, action: PayloadAction<{ user: IUser }>) => {
          state.loading = false;
          state.isAuthenticated = true;
          state.user = action.payload.user;
          state.checked = true;
        },
      )
      .addCase(checkAuth.rejected, (state) => {
        state.loading = false;
        state.isAuthenticated = false;
        state.user = null;
        state.checked = true;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;
