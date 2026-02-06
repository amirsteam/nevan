/**
 * Configuration utilities
 * Centralized config for URLs and environment settings
 */
import { Platform } from "react-native";

// ========== DEVELOPMENT CONFIGURATION ==========
// For SAME network testing: Use your computer's local IP (run `ipconfig` to find it)
// For DIFFERENT network testing: Run `ngrok http 5000` and paste the URL below

// Option 1: Local IP (same WiFi network)
const LOCAL_IP = "192.168.2.6";

// Option 2: Ngrok tunnel URL (different network / tunnel mode)
// Set this when using `npx expo start --tunnel`
// Example: "https://abc123.ngrok-free.app"
const NGROK_URL: string | null = "https://blurredly-iced-pablo.ngrok-free.dev"; // <-- Paste your ngrok URL here

// ================================================

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

    // Use ngrok URL if configured (for tunnel mode / different network)
    if (NGROK_URL) {
        return `${NGROK_URL.trim()}/api/v1`;
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

    // Use ngrok URL if configured (for tunnel mode / different network)
    if (NGROK_URL) {
        return NGROK_URL.trim();
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

// Export NGROK_URL for other modules
export { NGROK_URL, LOCAL_IP };

export default {
    LOCAL_IP,
    NGROK_URL,
    getApiUrl,
    getSocketUrl,
    isDev,
};
