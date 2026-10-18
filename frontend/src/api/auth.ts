/**
 * Auth API
 * API calls for authentication
 */
import api from "./axios";
import type {
  IUser,
  IApiResponse,
  IRegisterData,
  IAuthResponse,
  ITwoFactorPendingResponse,
  ITwoFactorSetup,
  ITwoFactorStatus,
  ISavedAddress,
  ISavedAddressInput,
} from "../types";

type AddressesResponse = IApiResponse<{ addresses: ISavedAddress[]; address?: ISavedAddress }>;

export const authAPI = {
  register: async (
    data: IRegisterData,
  ): Promise<IApiResponse<IAuthResponse>> => {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  // Admins get a two-step challenge instead of a session
  login: async (
    email: string,
    password: string,
  ): Promise<IApiResponse<IAuthResponse | ITwoFactorPendingResponse>> => {
    const response = await api.post("/auth/login", { email, password });
    return response.data;
  },

  // Signs in, or creates the account, from a Google Identity Services ID token
  google: async (idToken: string): Promise<IApiResponse<IAuthResponse | ITwoFactorPendingResponse>> => {
    const response = await api.post("/auth/google", { idToken });
    return response.data;
  },

  // ---------- Two-step login (admins) ----------

  // Finish a sign-in with an authenticator code or a backup code
  verifyTwoFactor: async (input: {
    challengeToken: string;
    code?: string;
    backupCode?: string;
    rememberDevice?: boolean;
  }): Promise<IApiResponse<IAuthResponse>> => {
    const response = await api.post("/auth/2fa/verify", input);
    return response.data;
  },

  // First sign-in: a new authenticator to scan
  setupTwoFactor: async (challengeToken: string): Promise<IApiResponse<ITwoFactorSetup>> => {
    const response = await api.post("/auth/2fa/setup", { challengeToken });
    return response.data;
  },

  // Its first code turns two-step login on and signs in (backup codes come back once)
  enableTwoFactor: async (input: {
    challengeToken: string;
    code: string;
    rememberDevice?: boolean;
  }): Promise<IApiResponse<IAuthResponse>> => {
    const response = await api.post("/auth/2fa/enable", input);
    return response.data;
  },

  twoFactorStatus: async (): Promise<IApiResponse<ITwoFactorStatus>> => {
    const response = await api.get("/auth/2fa");
    return response.data;
  },

  regenerateBackupCodes: async (code: string): Promise<IApiResponse<{ backupCodes: string[] }>> => {
    const response = await api.post("/auth/2fa/backup-codes", { code });
    return response.data;
  },

  // New phone, step 1: a code from the current app → the new QR code
  startTwoFactorReplace: async (code: string): Promise<IApiResponse<ITwoFactorSetup>> => {
    const response = await api.post("/auth/2fa/replace", { code });
    return response.data;
  },

  // Step 2: the new app's first code
  finishTwoFactorReplace: async (newCode: string): Promise<IApiResponse<null>> => {
    const response = await api.post("/auth/2fa/replace", { newCode });
    return response.data;
  },

  forgetTrustedDevices: async (): Promise<IApiResponse<null>> => {
    const response = await api.delete("/auth/2fa/devices");
    return response.data;
  },

  // The API ends the session identified by the httpOnly refresh cookie
  logout: async (): Promise<IApiResponse<null>> => {
    const response = await api.post("/auth/logout");
    return response.data;
  },

  getMe: async (): Promise<IApiResponse<{ user: IUser }>> => {
    const response = await api.get("/auth/me");
    return response.data;
  },

  // Other sessions end; this browser gets a new access token (and refresh cookie)
  changePassword: async (
    currentPassword: string,
    newPassword: string,
  ): Promise<IApiResponse<{ accessToken: string }>> => {
    const response = await api.put("/auth/change-password", {
      currentPassword,
      newPassword,
    });
    return response.data;
  },

  // `data.otp` is only returned by a development server without email set up
  forgotPassword: async (email: string): Promise<IApiResponse<{ otp?: string } | undefined>> => {
    const response = await api.post("/auth/forgot-password", { email });
    return response.data;
  },

  verifyResetOTP: async (
    email: string,
    otp: string,
  ): Promise<IApiResponse<null>> => {
    const response = await api.post("/auth/verify-reset-otp", { email, otp });
    return response.data;
  },

  resetPassword: async (
    email: string,
    otp: string,
    newPassword: string,
  ): Promise<IApiResponse<null>> => {
    const response = await api.post("/auth/reset-password", {
      email,
      otp,
      newPassword,
    });
    return response.data;
  },

  updateProfile: async (updates: { name?: string; phone?: string }): Promise<IApiResponse<{ user: IUser }>> => {
    const response = await api.put("/auth/me", updates);
    return response.data;
  },

  getAddresses: async (): Promise<AddressesResponse> => {
    const response = await api.get("/auth/addresses");
    return response.data;
  },

  addAddress: async (address: ISavedAddressInput): Promise<AddressesResponse> => {
    const response = await api.post("/auth/addresses", address);
    return response.data;
  },

  updateAddress: async (id: string, updates: Partial<ISavedAddressInput>): Promise<AddressesResponse> => {
    const response = await api.put(`/auth/addresses/${id}`, updates);
    return response.data;
  },

  deleteAddress: async (id: string): Promise<AddressesResponse> => {
    const response = await api.delete(`/auth/addresses/${id}`);
    return response.data;
  },
};

export default authAPI;
