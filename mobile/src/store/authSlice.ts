import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { authAPI } from "../api/auth";
import { getItem, setItem, deleteItem } from "../utils/storage";
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

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

// Async thunks
export const login = createAsyncThunk<
  AuthPayload,
  LoginCredentials,
  { rejectValue: string }
>("auth/login", async ({ email, password }, { rejectWithValue }) => {
  try {
    const response = await authAPI.login(email, password);
    const { accessToken, refreshToken, user } = response.data;

    await setItem("accessToken", accessToken);
    await setItem("refreshToken", refreshToken);

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

    await setItem("accessToken", accessToken);
    await setItem("refreshToken", refreshToken);

    return { user, accessToken };
  } catch (error: unknown) {
    const err = error as ApiError;
    return rejectWithValue(
      err.response?.data?.message || "Registration failed",
    );
  }
});

export const logout = createAsyncThunk<void, void, { rejectValue: string }>(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error("Logout error", error);
    } finally {
      await deleteItem("accessToken");
      await deleteItem("refreshToken");
    }
  },
);

export const checkAuth = createAsyncThunk<
  { user: IUser },
  void,
  { rejectValue: string }
>("auth/checkAuth", async (_, { rejectWithValue }) => {
  try {
    const token = await getItem("accessToken");
    if (!token) {
      return rejectWithValue("No token found");
    }
    const response = await authAPI.getMe();
    return { user: response.data.user };
  } catch (error: unknown) {
    await deleteItem("accessToken");
    await deleteItem("refreshToken");
    const err = error as ApiError;
    return rejectWithValue(err.response?.data?.message || "Session expired");
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
