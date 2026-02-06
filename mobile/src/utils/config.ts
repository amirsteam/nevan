/**
 * Configuration utilities
 * Centralized config for URLs and environment settings
 */
import { Platform } from "react-native";

// Single source of truth for local development IP
const LOCAL_IP = "192.168.1.2";

// Production URLs
const PRODUCTION_API_URL = "https://backend.nevanhandicraft.com.np/api/v1";
const PRODUCTION_SOCKET_URL = "https://backend.nevanhandicraft.com.np";

/**
 * Get the API base URL based on platform and environment
 * @returns API base URL (e.g., "http://192.168.1.2:5000/api/v1")
 */
export const getApiUrl = (): string => {
    // @ts-ignore - __DEV__ is a React Native global
    if (!__DEV__) {
        return PRODUCTION_API_URL;
    }

    if (Platform.OS === "web") return "http://localhost:5000/api/v1";
    if (Platform.OS === "android") return `http://${LOCAL_IP}:5000/api/v1`;
    return `http://${LOCAL_IP}:5000/api/v1`; // iOS
};

/**
 * Get the Socket.IO server URL based on platform and environment
 * @returns Socket URL (e.g., "http://192.168.1.2:5000")
 */
export const getSocketUrl = (): string => {
    // @ts-ignore - __DEV__ is a React Native global
    if (!__DEV__) {
        return PRODUCTION_SOCKET_URL;
    }

    if (Platform.OS === "web") return "http://localhost:5000";
    if (Platform.OS === "android") return `http://${LOCAL_IP}:5000`;
    return `http://${LOCAL_IP}:5000`; // iOS
};

/**
 * Check if running in development mode
 */
export const isDev = (): boolean => {
    // @ts-ignore - __DEV__ is a React Native global
    return __DEV__ ?? false;
};

export default {
    LOCAL_IP,
    getApiUrl,
    getSocketUrl,
    isDev,
};
