/**
 * Socket Service for React Native
 * One Socket.IO connection to the /chat namespace. A fresh access token is fetched
 * (refreshing it if needed) on every (re)connect, and an auth failure refreshes the
 * token and reconnects the same socket so screen listeners stay attached.
 */
import { io, Socket } from "socket.io-client";
import { getSocketUrl } from "../utils/config";
import { getValidAccessToken, refreshTokens } from "../api/tokenRefresh";

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

    /** Connect (or reuse the existing socket) */
    connect(): Socket {
        if (this.socket) {
            if (!this.socket.connected) this.socket.connect();
            return this.socket;
        }

        this.socket = io(`${getSocketUrl()}${this.namespace}`, {
            // Called on every connection attempt; refreshes an expired token first
            auth: (cb) => {
                getValidAccessToken().then((token) => cb({ token }));
            },
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionDelay: 1000,
        });

        this.socket.on("connect", () => {
            this.refreshAttempts = 0;
        });

        this.socket.on("connect_error", async (error) => {
            const isAuthError = AUTH_ERRORS.some((msg) => error.message.includes(msg));
            if (!isAuthError || this.refreshAttempts >= 3) return;
            this.refreshAttempts++;
            if (await refreshTokens()) this.socket?.connect();
        });

        return this.socket;
    }

    /** Close the connection and drop all listeners (logout) */
    disconnect(): void {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
        this.refreshAttempts = 0;
    }

    /** Emit and wait for the acknowledgement; resolves with an error instead of hanging */
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

const socketService = new SocketService();
export default socketService;
