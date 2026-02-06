/**
 * ChatWindow Component
 * Main chat container with header, messages, and input
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { X, Send, RefreshCw, ChevronLeft, User, Image as ImageIcon } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { RootState, AppDispatch } from "../../store";
import api from "../../api/axios";
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

interface ChatRoom {
    _id: string;
    customerId: { _id: string; name: string; email: string };
    lastMessageAt: string;
    unreadCountCustomer: number;
    unreadCountAdmin: number;
}

const ChatWindow = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { connectionStatus, activeRoomId } = useSelector(
        (state: RootState) => state.chat
    );
    const { user } = useAuth();
    const [typingText, setTypingText] = useState<string>("");
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const isInitializedRef = useRef(false);

    // Missing state variables
    const [inputMessage, setInputMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [adminRooms, setAdminRooms] = useState<ChatRoom[]>([]);
    const [isAdminView, setIsAdminView] = useState(user?.role === "admin");

    // Initialize socket connection
    const initializeChat = useCallback(() => {
        dispatch(setIsLoading(true));
        dispatch(setConnectionStatus("connecting"));

        const socket = socketService.connect();

        if (!socket) {
            dispatch(setConnectionStatus("error"));
            dispatch(setIsLoading(false));
            return;
        }

        // Handler for connection success (reused for existing connections)
        const onConnect = () => {
            dispatch(setConnectionStatus("connected"));

            if (user?.role === "admin") {
                // Admin: Fetch active rooms
                socket.emit("get-rooms", (response: { success: boolean; rooms: ChatRoom[] }) => {
                    dispatch(setIsLoading(false));
                    if (response.success) {
                        setAdminRooms(response.rooms);
                    }
                });
            } else {
                // Customer: Join their own room
                socket.emit(
                    "join-chat",
                    {},
                    (response: { success: boolean; roomId?: string; error?: string }) => {
                        dispatch(setIsLoading(false));
                        if (response.success && response.roomId) {
                            dispatch(setActiveRoomId(response.roomId));
                        }
                    }
                );
            }
        };

        // Handle connection events
        socket.on("connect", onConnect);

        // If already connected, trigger handler immediately
        if (socket.connected) {
            onConnect();
        }

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
            if (user?.role === "admin" && !activeRoomId) {
                socket.emit("get-rooms", (response: { success: boolean; rooms: ChatRoom[] }) => {
                    if (response.success) setAdminRooms(response.rooms);
                });
            } else {
                dispatch(addMessage(message));
                // Mark as read immediately if we are in this room
                if (activeRoomId === message.roomId) {
                    socket.emit("message-read", { roomId: message.roomId, messageIds: [message._id] });
                }
            }
        });

        // Typing events
        socket.on("typing", (data: { userId: string; userRole: string }) => {
            setTypingText(`${data.userRole === "admin" ? "Support" : "Customer"} is typing...`);
        });

        socket.on("stop-typing", () => {
            setTypingText("");
        });

        // Message read receipt
        socket.on("message-read", () => {
            // In a real app we'd update specific message statuses here
        });

    }, [dispatch, user?.role, activeRoomId]);

    // Handle Input Change with Debounced Typing Emit
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setInputMessage(e.target.value);

        if (!activeRoomId) return;

        const socket = socketService.getSocket();

        // Emit typing event
        socket?.emit("typing", { roomId: activeRoomId });

        // Clear existing timeout
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        // Set timeout to stop typing after 2 seconds of inactivity
        typingTimeoutRef.current = setTimeout(() => {
            socket?.emit("stop-typing", { roomId: activeRoomId });
        }, 2000);
    };

    // Admin: Join specific room
    const handleAdminJoinRoom = (roomId: string) => {
        const socket = socketService.getSocket();
        if (!socket) return;

        dispatch(setIsLoading(true));
        socket.emit("join-chat", { roomId }, (response: { success: boolean; roomId?: string }) => {
            dispatch(setIsLoading(false));
            if (response.success && response.roomId) {
                dispatch(setActiveRoomId(response.roomId));
                setIsAdminView(false);
            }
        });
    };

    // Admin: Back to room list
    const handleBackToRooms = () => {
        dispatch(setActiveRoomId(null));
        setMessages([]);
        setIsAdminView(true);
        // Refresh rooms
        const socket = socketService.getSocket();
        socket?.emit("get-rooms", (response: { success: boolean; rooms: ChatRoom[] }) => {
            if (response.success) setAdminRooms(response.rooms);
        });
    };

    // Connect on mount
    useEffect(() => {
        // Prevent duplicate initialization
        if (isInitializedRef.current) return;
        isInitializedRef.current = true;
        
        initializeChat();

        return () => {
            isInitializedRef.current = false;
            socketService.off("connect");
            socketService.off("connect_error");
            socketService.off("disconnect");
            socketService.off("chat-history");
            socketService.off("new-message");
            socketService.off("typing");
            socketService.off("stop-typing");
            socketService.off("message-read");
            if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        };
    }, []); // Empty dependency array - initialize once on mount

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
                    {user?.role === "admin" && activeRoomId && (
                        <button onClick={handleBackToRooms} className="mr-1 hover:bg-white/20 rounded-full p-1">
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                        {isAdminView && !activeRoomId ? <User size={18} /> : "💬"}
                    </div>
                    <div>
                        <h3 className="font-semibold text-sm">
                            {user?.role === "admin" && !activeRoomId ? "Active Chats" : "Support Chat"}
                        </h3>
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

            {/* Admin Room List */}
            {user?.role === "admin" && !activeRoomId ? (
                <div className="flex-1 overflow-y-auto p-2">
                    {adminRooms.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <p>No active chats found</p>
                        </div>
                    ) : (
                        adminRooms.map((room) => (
                            <div
                                key={room._id}
                                onClick={() => handleAdminJoinRoom(room._id)}
                                className="p-3 mb-2 rounded-lg bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition-colors border border-gray-100 dark:border-gray-600"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                                        {room.customerId?.name || "Unknown Customer"}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                        {room.lastMessageAt
                                            ? new Date(room.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                            : ""}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 truncate mb-1">
                                    {room.customerId?.email}
                                </p>
                                {room.unreadCountAdmin > 0 && (
                                    <span className="inline-block px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full">
                                        {room.unreadCountAdmin} unread
                                    </span>
                                )}
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <>
                    {/* Chat Messages */}
                    <MessageList />

                    {/* Typing Indicator */}
                    {typingText && (
                        <div className="px-4 py-1 text-xs text-gray-500 italic animate-pulse">
                            {typingText}
                        </div>
                    )}

                    {/* Input */}
                    <form
                        onSubmit={handleSendMessage}
                        className="p-3 border-t border-gray-200 dark:border-gray-700 bg-white"
                    >
                        {/* Image Preview (Simple version - assume direct upload for now) */}

                        <div className="flex gap-2 items-end">
                            <input
                                type="file"
                                id="chat-image-upload"
                                className="hidden"
                                accept="image/*"
                                onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file || !activeRoomId) return;

                                    // Upload immediately
                                    const formData = new FormData();
                                    formData.append('image', file);

                                    try {
                                        dispatch(setIsLoading(true));

                                        // Use axios instance with interceptors
                                        const { data } = await api.post('/chat/upload', formData, {
                                            headers: {
                                                'Content-Type': 'multipart/form-data',
                                            },
                                        });

                                        if (data.success) {
                                            // Send message with attachment
                                            socketService.emit(
                                                "send-message",
                                                {
                                                    roomId: activeRoomId,
                                                    content: "Sent an image",
                                                    attachments: [{ type: 'image', url: data.url }]
                                                },
                                                (response: { success: boolean; error?: string }) => {
                                                    if (!response.success) {
                                                        console.error("Failed to send image message:", response.error);
                                                    }
                                                }
                                            );
                                        }
                                        dispatch(setIsLoading(false));
                                    } catch (err) {
                                        console.error(err);
                                        dispatch(setIsLoading(false));
                                    }

                                    // Reset input
                                    e.target.value = '';
                                }}
                            />

                            <button
                                type="button"
                                onClick={() => document.getElementById('chat-image-upload')?.click()}
                                className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
                                disabled={connectionStatus !== "connected"}
                                title="Send Image"
                            >
                                <ImageIcon size={20} />
                            </button>

                            <input
                                type="text"
                                value={inputMessage}
                                onChange={handleInputChange}
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
                </>
            )}
        </div>
    );
};

export default ChatWindow;
