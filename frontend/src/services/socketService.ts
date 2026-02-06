/**
 * Socket Service
 * Manages WebSocket connection for real-time chat with automatic token refresh
 */
import { io, Socket } from "socket.io-client";
import axios from "axios";

// Get API URL from env, strip /api/v1 suffix if present
const getSocketUrl = (): string => {
    const apiUrl = (import.meta as any).env.VITE_API_URL || "http://localhost:5000/api/v1";
    // Remove /api/v1 suffix to get base URL
    return apiUrl.replace(/\/api\/v1\/?$/, "");
};

const getApiUrl = (): string => {
    return (import.meta as any).env.VITE_API_URL || "http://localhost:5000/api/v1";
};

class SocketService {
    private socket: Socket | null = null;
    private namespace = "/chat";
    private refreshAttempts = 0;
    private maxRefreshAttempts = 3;

    /**
     * Attempt to refresh the access token
     */
    private async refreshToken(): Promise<string | null> {
        try {
            const refreshToken = localStorage.getItem("refreshToken");
            if (!refreshToken) {
                console.warn("Socket: No refresh token available");
                return null;
            }

            const response = await axios.post(`${getApiUrl()}/auth/refresh-token`, {
                refreshToken,
            });

            const { accessToken, refreshToken: newRefreshToken } = response.data.data;

            // Store new tokens
            localStorage.setItem("accessToken", accessToken);
            localStorage.setItem("refreshToken", newRefreshToken);

            console.log("Socket: Token refreshed successfully");
            return accessToken;
        } catch (error) {
            console.error("Socket: Token refresh failed", error);
            // Clear tokens on refresh failure
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            return null;
        }
    }

    /**
     * Connect to the socket server with JWT authentication
     * Automatically attempts token refresh on auth errors
     */
    connect(): Socket | null {
        const token = localStorage.getItem("accessToken");

        if (!token) {
            console.warn("Socket: No access token available");
            return null;
        }

        if (this.socket?.connected) {
            console.log("Socket: Already connected");
            return this.socket;
        }

        const socketUrl = getSocketUrl();
        console.log(`Socket: Connecting to ${socketUrl}${this.namespace}`);

        this.socket = io(`${socketUrl}${this.namespace}`, {
            auth: { token },
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
        });

        this.socket.on("connect", () => {
            console.log("Socket: Connected successfully", this.socket?.id);
            // Reset refresh attempts on successful connection
            this.refreshAttempts = 0;
        });

        this.socket.on("connect_error", async (error) => {
            console.error("Socket: Connection error", error.message);

            // Check if error is due to invalid/expired token
            const isAuthError = 
                error.message.includes("Invalid or expired token") ||
                error.message.includes("Authentication") ||
                error.message.includes("jwt");

            if (isAuthError && this.refreshAttempts < this.maxRefreshAttempts) {
                this.refreshAttempts++;
                console.log(`Socket: Attempting token refresh (${this.refreshAttempts}/${this.maxRefreshAttempts})`);

                const newToken = await this.refreshToken();
                if (newToken) {
                    // Disconnect current socket and reconnect with new token
                    this.socket?.disconnect();
                    this.socket = null;
                    
                    // Small delay before reconnecting
                    setTimeout(() => {
                        this.connect();
                    }, 500);
                }
            }
        });

        this.socket.on("disconnect", (reason) => {
            console.log("Socket: Disconnected", reason);
        });

        return this.socket;
    }

    /**
     * Disconnect from the socket server
     */
    disconnect(): void {
        if (this.socket) {
            console.log("Socket: Disconnecting...");
            this.socket.disconnect();
            this.socket = null;
        }
        // Reset refresh attempts on manual disconnect
        this.refreshAttempts = 0;
    }

    /**
     * Emit an event to the server with optional callback
     */
    emit<T = any>(
        event: string,
        data?: any,
        callback?: (response: T) => void
    ): void {
        if (!this.socket?.connected) {
            console.warn("Socket: Not connected, cannot emit", event);
            return;
        }
        this.socket.emit(event, data, callback);
    }

    /**
     * Listen for an event from the server
     */
    on<T = any>(event: string, callback: (data: T) => void): void {
        if (!this.socket) {
            console.warn("Socket: Not initialized, cannot listen for", event);
            return;
        }
        this.socket.on(event, callback);
    }

    /**
     * Remove event listener
     */
    off(event: string, callback?: (...args: any[]) => void): void {
        if (!this.socket) return;
        this.socket.off(event, callback);
    }

    /**
     * Get connection status
     */
    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    /**
     * Get the socket instance
     */
    getSocket(): Socket | null {
        return this.socket;
    }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
