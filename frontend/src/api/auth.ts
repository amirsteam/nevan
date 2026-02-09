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
} from "../types";

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

  logout: async (): Promise<IApiResponse<null>> => {
    const response = await api.post("/auth/logout");
    return response.data;
  },

  refreshToken: async (
    refreshToken: string,
  ): Promise<IApiResponse<{ accessToken: string; refreshToken: string }>> => {
    const response = await api.post("/auth/refresh-token", { refreshToken });
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

  forgotPassword: async (email: string): Promise<IApiResponse<null>> => {
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
};

export default authAPI;
