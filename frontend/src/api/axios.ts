/**
 * Axios Instance
 * Pre-configured axios instance with interceptors for auth.
 *
 * Token storage:
 * - The access token lives only in memory (never localStorage), so XSS can't steal it from storage.
 * - The refresh token is an httpOnly cookie set by the API (scoped to /api/v1/auth);
 *   page code never sees it. `refreshAccessToken()` trades it for a new access token.
 */
import axios, { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// Extend InternalAxiosRequestConfig to include _retry property
interface CustomAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

export const API_BASE_URL: string = import.meta.env.VITE_API_URL || '/api/v1';

let accessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const getAccessToken = (): string | null => accessToken;

export const setAccessToken = (token: string | null): void => {
    accessToken = token;
};

/**
 * Exchange the refresh cookie for a new access token.
 * Concurrent callers share one request: the API rotates refresh tokens,
 * so parallel refreshes would otherwise race each other.
 */
export const refreshAccessToken = (): Promise<string | null> => {
    if (!refreshPromise) {
        refreshPromise = axios
            .post(`${API_BASE_URL}/auth/refresh-token`, {}, { withCredentials: true })
            .then((response) => {
                const token: string = response.data.data.accessToken;
                setAccessToken(token);
                return token;
            })
            .catch(() => {
                setAccessToken(null);
                return null;
            })
            .finally(() => {
                refreshPromise = null;
            });
    }
    return refreshPromise;
};

// Create axios instance
const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
    withCredentials: true, // send the refresh cookie to /auth endpoints
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        if (accessToken) {
            config.headers.Authorization = `Bearer ${accessToken}`;
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
        // Don't retry for auth endpoints (login, register, refresh-token, logout)
        const isAuthRequest = originalRequest.url.includes('/auth/login') ||
                             originalRequest.url.includes('/auth/register') ||
                             originalRequest.url.includes('/auth/refresh-token') ||
                             originalRequest.url.includes('/auth/logout');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
            originalRequest._retry = true;

            const newToken = await refreshAccessToken();
            if (newToken) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
                return api(originalRequest);
            }

            // Refresh failed - session is over
            window.location.href = '/login';
        }

        return Promise.reject(error);
    }
);

export default api;
