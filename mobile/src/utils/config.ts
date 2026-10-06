/**
 * Configuration utilities
 * Centralized config for URLs and environment settings
 */
import { Platform } from "react-native";

// ========== DEVELOPMENT CONFIGURATION ==========
// Set these in mobile/.env.local (gitignored; see .env.example) and restart Expo:
//   EXPO_PUBLIC_API_URL   Full API URL override, e.g. https://abc123.ngrok-free.app/api/v1
//                         (use for tunnel mode / different network)
//   EXPO_PUBLIC_DEV_HOST  Your computer's LAN IP for real devices on the same WiFi
//                         (run `ipconfig` / `ifconfig` to find it), e.g. 192.168.1.10
// Without either, emulators/simulators reach the host machine directly.

const API_URL_OVERRIDE = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, "") || null;
const DEV_HOST = process.env.EXPO_PUBLIC_DEV_HOST?.trim() || null;
const DEV_PORT = 5000;

// ================================================

// Production URLs
const PRODUCTION_API_URL = "https://backend.nevanhandicraft.com.np/api/v1";

const getDevHost = (): string => {
    if (DEV_HOST) return DEV_HOST;
    // Android emulator reaches the host machine via 10.0.2.2
    if (Platform.OS === "android") return "10.0.2.2";
    return "localhost"; // iOS simulator / web
};

/**
 * Get the API base URL based on platform and environment
 * @returns API base URL (e.g., "http://192.168.1.2:5000/api/v1")
 */
export const getApiUrl = (): string => {
    // @ts-ignore - __DEV__ is a React Native global
    if (!__DEV__) {
        return PRODUCTION_API_URL;
    }

    if (API_URL_OVERRIDE) return API_URL_OVERRIDE;

    return `http://${getDevHost()}:${DEV_PORT}/api/v1`;
};

/**
 * Get the Socket.IO server URL based on platform and environment
 * @returns Socket URL (e.g., "http://192.168.1.2:5000")
 */
export const getSocketUrl = (): string => getApiUrl().replace(/\/api\/v1$/, "");

/**
 * Check if running in development mode
 */
export const isDev = (): boolean => {
    // @ts-ignore - __DEV__ is a React Native global
    return __DEV__ ?? false;
};

export default {
    getApiUrl,
    getSocketUrl,
    isDev,
};
