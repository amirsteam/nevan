/**
 * Socket Service
 * Manages WebSocket connection for real-time chat
 */
import { io, Socket } from "socket.io-client";

// Get API URL from env, strip /api/v1 suffix if present
const getSocketUrl = (): string => {
    const apiUrl = (import.meta as any).env.VITE_API_URL || "http://localhost:5000/api/v1";
    // Remove /api/v1 suffix to get base URL
    return apiUrl.replace(/\/api\/v1\/?$/, "");
};

class SocketService {
    private socket: Socket | null = null;
    private namespace = "/chat";

    /**
     * Connect to the socket server with JWT authentication
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
        });

        this.socket.on("connect_error", (error) => {
            console.error("Socket: Connection error", error.message);
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
