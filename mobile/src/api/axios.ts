import axios, {
  AxiosError,
  InternalAxiosRequestConfig,
  AxiosResponse,
} from "axios";
import { getItem, setItem, deleteItem } from "../utils/storage";
import { Platform } from "react-native";

// Extend InternalAxiosRequestConfig to include _retry property
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Use machine's local IP for development on real devices/emulators
const getBaseUrl = (): string => {
  const LOCAL_IP = "192.168.1.3";

  // @ts-ignore - __DEV__ is a React Native global
  if (!__DEV__) {
    return "https://backend.nevanhandicraft.com.np/api/v1";
  }

  if (Platform.OS === "web") return "http://localhost:5000/api/v1";
  if (Platform.OS === "android") return `http://${LOCAL_IP}:5000/api/v1`;
  return `http://${LOCAL_IP}:5000/api/v1`; // iOS
};

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

      try {
        const refreshToken = await getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        // Try to refresh the token
        const response = await axios.post(`${BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken, refreshToken: newRefreshToken } =
          response.data.data;

        // Store new tokens
        await setItem("accessToken", accessToken);
        await setItem("refreshToken", newRefreshToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        // Refresh failed - clear tokens
        await deleteItem("accessToken");
        await deleteItem("refreshToken");
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
