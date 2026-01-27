import api from "./axios";
import type {
  IApiResponse,
  IUser,
  IRegisterData,
  IAuthResponse,
} from "@shared/types";

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
};

export default authAPI;
