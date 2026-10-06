/**
 * Socket Service
 * One Socket.IO connection to the /chat namespace per signed-in session.
 * The access token is read on every (re)connect, and an auth failure refreshes
 * the token and reconnects the *same* socket, so listeners stay attached.
 */
import { io, Socket } from "socket.io-client";
import { API_BASE_URL, getAccessToken, refreshAccessToken } from "../api/axios";

// Socket server origin: the API URL without its /api/v1 suffix.
// A relative API URL (Vite proxy in dev) means the socket server is the page origin.
const getSocketUrl = (): string => {
    const base = API_BASE_URL.replace(/\/api\/v1\/?$/, "");
    return base.startsWith("http") ? base : window.location.origin;
};

const AUTH_ERRORS = ["Invalid or expired token", "Authentication required"];

export interface AckResponse {
    success: boolean;
    error?: string;
    code?: string;
    [key: string]: unknown;
}

class SocketService {
    private socket: Socket | null = null;
    private namespace = "/chat";
    private refreshAttempts = 0;
    private maxRefreshAttempts = 3;

    /**
     * Connect (or return the existing socket). Returns null when signed out.
     */
    connect(): Socket | null {
        if (this.socket) {
            if (!this.socket.connected) this.socket.connect();
            return this.socket;
        }
        if (!getAccessToken()) return null;

        this.socket = io(`${getSocketUrl()}${this.namespace}`, {
            // Evaluated on every connection attempt, so reconnects use the current token
            auth: (cb) => cb({ token: getAccessToken() }),
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionDelay: 1000,
        });

        this.socket.on("connect", () => {
            this.refreshAttempts = 0;
        });

        this.socket.on("connect_error", async (error) => {
            const isAuthError = AUTH_ERRORS.some((msg) => error.message.includes(msg));
            if (!isAuthError || this.refreshAttempts >= this.maxRefreshAttempts) return;

            this.refreshAttempts++;
            const token = await refreshAccessToken();
            if (token) this.socket?.connect();
        });

        this.socket.on("disconnect", (reason) => {
            // The server ended the connection (e.g. account deactivated or sessions revoked).
            // Try once more: a valid session reconnects, a revoked one fails auth.
            if (reason === "io server disconnect") {
                setTimeout(() => this.socket?.connect(), 1000);
            }
        });

        return this.socket;
    }

    /** Close the connection and drop all listeners (sign-out) */
    disconnect(): void {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
        this.refreshAttempts = 0;
    }

    /**
     * Emit and wait for the server's acknowledgement. Resolves with an error
     * response (never hangs) when offline or when the server doesn't answer.
     */
    request<T extends AckResponse = AckResponse>(event: string, data?: unknown, timeoutMs = 10000): Promise<T> {
        return new Promise((resolve) => {
            if (!this.socket?.connected) {
                resolve({ success: false, error: "Not connected to chat. Please try again." } as T);
                return;
            }
            this.socket
                .timeout(timeoutMs)
                .emit(event, data ?? {}, (err: Error | null, response: T) => {
                    resolve(err ? ({ success: false, error: "The chat server did not respond" } as T) : response);
                });
        });
    }

    /** Fire-and-forget event (typing, read receipts) */
    send(event: string, data?: unknown): void {
        if (this.socket?.connected) this.socket.emit(event, data);
    }

    isConnected(): boolean {
        return this.socket?.connected ?? false;
    }

    getSocket(): Socket | null {
        return this.socket;
    }
}

// Export singleton instance
const socketService = new SocketService();
export default socketService;
