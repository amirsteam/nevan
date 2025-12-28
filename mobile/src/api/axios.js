import axios from 'axios';
import { getItem, setItem, deleteItem } from '../utils/storage';
import { Platform } from 'react-native';

// Use localhost for Web, 10.0.2.2 for Android Emulator, localhost for iOS Simulator
const getBaseUrl = () => {
    if (Platform.OS === 'web') return 'http://localhost:5000/api/v1';
    if (Platform.OS === 'android') return 'http://10.0.2.2:5000/api/v1';
    return 'http://localhost:5000/api/v1'; // iOS
};

const BASE_URL = getBaseUrl();

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
});

// Request interceptor - add auth token
api.interceptors.request.use(
    async (config) => {
        try {
            const token = await getItem('accessToken');
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error('Error retrieving token', error);
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        const isAuthRequest = originalRequest.url.includes('/auth/login') ||
            originalRequest.url.includes('/auth/register') ||
            originalRequest.url.includes('/auth/refresh-token');

        if (error.response?.status === 401 && !originalRequest._retry && !isAuthRequest) {
            originalRequest._retry = true;

            try {
                const refreshToken = await getItem('refreshToken');
                if (!refreshToken) {
                    throw new Error('No refresh token');
                }

                // Try to refresh the token
                const response = await axios.post(`${BASE_URL}/auth/refresh-token`, {
                    refreshToken,
                });

                const { accessToken, refreshToken: newRefreshToken } = response.data.data;

                // Store new tokens
                await setItem('accessToken', accessToken);
                await setItem('refreshToken', newRefreshToken);

                // Retry original request with new token
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return api(originalRequest);
            } catch (refreshError) {
                // Refresh failed - clear tokens
                await deleteItem('accessToken');
                await deleteItem('refreshToken');
                // Navigation to login should be handled by the app state (token check)
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

export default api;
