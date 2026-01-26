/**
 * Axios Instance
 * Pre-configured axios instance with interceptors for auth
 */
import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Extend InternalAxiosRequestConfig to include _retry property
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

// Create axios instance
const api = axios.create({
    baseURL: (import.meta as any).env.VITE_API_URL || '/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as CustomAxiosRequestConfig;

        if (!originalRequest || !originalRequest.url) {
            return Promise.reject(error);
        }

        // If 401 and we haven't tried refreshing yet
        // Don't retry for auth endpoints (login, register, refresh-token)
        const isAuthRequest = originalRequest.url.includes('/auth/login') || 
                             originalRequest.url.includes('/auth/register') || 
                             originalRequest.url.includes('/auth/refresh-token');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                // Try to refresh the token
                const baseURL = (import.meta as any).env.VITE_API_URL || '/api/v1';
                const response = await axios.post(`${baseURL}/auth/refresh-token`, {
                    refreshToken,
                });

                const { accessToken, refreshToken: newRefreshToken } = response.data.data;

                // Store new tokens
                localStorage.setItem('accessToken', accessToken);
                localStorage.setItem('refreshToken', newRefreshToken);

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed - clear tokens and redirect to login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
