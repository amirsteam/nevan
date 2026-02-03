/**
 * ChatWindow Component
 * Main chat container with header, messages, and input
 */
import { useState, useEffect, useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Send, RefreshCw } from "lucide-react";
import { RootState, AppDispatch } from "../../store";
import {
    setIsOpen,
    setActiveRoomId,
    setMessages,
    addMessage,
    setConnectionStatus,
    setIsLoading,
    ChatMessage,
} from "../../store/chatSlice";
import socketService from "../../services/socketService";
import MessageList from "./MessageList";

interface ChatWindowProps {
    currentUserId: string | null;
}

const ChatWindow = ({ currentUserId }: ChatWindowProps) => {
    const dispatch = useDispatch<AppDispatch>();
    const { connectionStatus, activeRoomId } = useSelector(
        (state: RootState) => state.chat
    );
    const [inputMessage, setInputMessage] = useState("");
    const [isSending, setIsSending] = useState(false);

    // Initialize socket connection and join chat
    const initializeChat = useCallback(() => {
        dispatch(setIsLoading(true));
        dispatch(setConnectionStatus("connecting"));

        const socket = socketService.connect();

        if (!socket) {
            dispatch(setConnectionStatus("error"));
            dispatch(setIsLoading(false));
            return;
        }

        // Handle connection events
        socket.on("connect", () => {
            dispatch(setConnectionStatus("connected"));

            // Join chat room
            socketService.emit(
                "join-chat",
                {},
                (response: { success: boolean; roomId?: string; error?: string }) => {
                    dispatch(setIsLoading(false));
                    if (response.success && response.roomId) {
                        dispatch(setActiveRoomId(response.roomId));
                    } else {
                        console.error("Failed to join chat:", response.error);
                    }
                }
            );
        });

        socket.on("connect_error", () => {
            dispatch(setConnectionStatus("error"));
            dispatch(setIsLoading(false));
        });

        socket.on("disconnect", () => {
            dispatch(setConnectionStatus("disconnected"));
        });

        // Handle incoming messages
        socket.on("chat-history", (data: { roomId: string; messages: ChatMessage[] }) => {
            dispatch(setMessages(data.messages));
        });

        socket.on("new-message", (message: ChatMessage) => {
            dispatch(addMessage(message));
        });
    }, [dispatch]);

    // Connect on mount
    useEffect(() => {
        initializeChat();

        return () => {
            socketService.off("connect");
            socketService.off("connect_error");
            socketService.off("disconnect");
            socketService.off("chat-history");
            socketService.off("new-message");
        };
    }, [initializeChat]);

    // Handle sending message
    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedMessage = inputMessage.trim();

        if (!trimmedMessage || !activeRoomId || isSending) return;

        setIsSending(true);

        socketService.emit(
            "send-message",
            { roomId: activeRoomId, content: trimmedMessage },
            (response: { success: boolean; error?: string }) => {
                setIsSending(false);
                if (response.success) {
                    setInputMessage("");
                } else {
                    console.error("Failed to send message:", response.error);
                }
            }
        );
    };

    // Handle close
    const handleClose = () => {
        dispatch(setIsOpen(false));
    };

    // Handle reconnect
    const handleReconnect = () => {
        socketService.disconnect();
        initializeChat();
    };

    return (
        <div className="fixed bottom-20 right-4 z-50 w-[360px] h-[500px] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        💬
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">Support Chat</h3>
                        <div className="flex items-center gap-1">
                            <span
                                className={`w-2 h-2 rounded-full ${connectionStatus === "connected"
                                        ? "bg-green-400"
                                        : connectionStatus === "connecting"
                                            ? "bg-yellow-400 animate-pulse"
                                            : "bg-red-400"
                                    }`}
                            />
                            <span className="text-xs opacity-80 capitalize">
                                {connectionStatus}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {connectionStatus === "error" && (
                        <button
                            onClick={handleReconnect}
                            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                            title="Reconnect"
                        >
                            <RefreshCw size={18} />
                        </button>
                    )}
                    <button
                        onClick={handleClose}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {/* Messages */}
            <MessageList currentUserId={currentUserId} />

            {/* Input */}
            <form
                onSubmit={handleSendMessage}
                className="p-3 border-t border-gray-200 dark:border-gray-700"
            >
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={inputMessage}
                        onChange={(e) => setInputMessage(e.target.value)}
                        placeholder="Type a message..."
                        className="flex-1 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-700 border-0 focus:ring-2 focus:ring-indigo-500 text-sm"
                        disabled={connectionStatus !== "connected"}
                    />
                    <button
                        type="submit"
                        disabled={!inputMessage.trim() || isSending || connectionStatus !== "connected"}
                        className="p-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Send size={18} />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ChatWindow;
