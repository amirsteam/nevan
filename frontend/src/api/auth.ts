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

  login: async (
    email: string,
    password: string,
  ): Promise<IApiResponse<IAuthResponse>> => {
    const response = await api.post("/auth/login", { email, password });
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

  changePassword: async (
    currentPassword: string,
    newPassword: string,
  ): Promise<IApiResponse<null>> => {
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
