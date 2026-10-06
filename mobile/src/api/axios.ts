import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { getItem } from "../utils/storage";
import { getApiUrl } from "../utils/config";
import { refreshTokens } from "./tokenRefresh";

// Extend InternalAxiosRequestConfig to include _retry property
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Dev server address comes from EXPO_PUBLIC_* env vars (see src/utils/config.ts)
const getBaseUrl = (): string => getApiUrl();

const BASE_URL = getBaseUrl();

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await getItem("accessToken");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error("Error retrieving token", error);
    }
    return config;
  },
  (error: AxiosError) => {
    return Promise.reject(error);
  },
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as CustomAxiosRequestConfig;

    if (!originalRequest || !originalRequest.url) {
      return Promise.reject(error);
    }

    const isAuthRequest =
      originalRequest.url.includes("/auth/login") ||
      originalRequest.url.includes("/auth/register") ||
      originalRequest.url.includes("/auth/refresh-token");

    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !isAuthRequest
    ) {
      originalRequest._retry = true;

      const accessToken = await refreshTokens();
      if (accessToken) {
        // Retry original request with the new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      }
      return Promise.reject(error);
    }

    return Promise.reject(error);
  },
);

export default api;
