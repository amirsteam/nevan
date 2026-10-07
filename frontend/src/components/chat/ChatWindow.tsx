/**
 * ChatWindow Component
 * Customers: their support conversation. Admins: the shared inbox (open/closed)
 * and any conversation in it. The connection itself is managed by useChatConnection.
 */
import { useState, useEffect, useRef, ChangeEvent, FormEvent } from "react";
import { X, Send, RefreshCw, ChevronLeft, User, Image as ImageIcon, CheckCircle2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import api from "../../api/axios";
import {
    clearDraft,
    setIsOpen,
    enterRoom,
    leaveRoom,
    setIsLoading,
    setRoomFilter,
    clearPendingRoom,
    roomClosed,
    roomDisplayName,
    setMessages,
    type ChatMessage,
} from "../../store/chatSlice";
import socketService, { AckResponse } from "../../services/socketService";
import { refreshRooms } from "../../hooks/useChatConnection";
import { getErrorMessage } from "../../utils/helpers";
import MessageList from "./MessageList";
import GuestChatStart from "./GuestChatStart";
import { loadGuestSession } from "../../utils/guestChat";
import { CONTACT } from "../../config/store";

const MAX_MESSAGE_LENGTH = 2000;

interface JoinResponse extends AckResponse {
    roomId?: string;
    status?: "open" | "closed";
    // The conversation's latest messages come with the join itself
    messages?: ChatMessage[];
    hasMore?: boolean;
}

const formatRoomTime = (iso?: string) => {
    if (!iso) return "";
    const date = new Date(iso);
    return date.toDateString() === new Date().toDateString()
        ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

interface ChatWindowProps {
    /** Rendered inside a page (admin Live chat) instead of as a floating window */
    embedded?: boolean;
}

const ChatWindow = ({ embedded = false }: ChatWindowProps) => {
    const dispatch = useAppDispatch();
    const { user, isAuthenticated, loading: authLoading } = useAuth();
    const isAdmin = isAuthenticated && user?.role === "admin";
    const guest = useAppSelector((state) => state.chat.guest);
    // Signed-out visitors first start a guest chat
    const needsGuestStart = !authLoading && !isAuthenticated && !guest;
    const {
        connectionStatus,
        activeRoomId,
        roomStatus,
        rooms,
        roomFilter,
        pendingRoomId,
        typing,
        messages,
    } = useAppSelector((state) => state.chat);

    const [inputMessage, setInputMessage] = useState("");
    const draft = useAppSelector((state) => state.chat.draft);

    // Start the message box with a draft (e.g. "Order #NV-123: " from an order page)
    useEffect(() => {
        if (!draft) return;
        setInputMessage((current) => current || draft);
        dispatch(clearDraft());
    }, [draft, dispatch]);
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const connected = connectionStatus === "connected";

    const activeRoom = rooms.find((r) => r._id === activeRoomId);

    /** Open a conversation: the customer's own, or the given room for admins */
    const joinRoom = async (roomId?: string) => {
        dispatch(setIsLoading(true));
        const res = await socketService.request<JoinResponse>("join-chat", roomId ? { roomId } : {});
        dispatch(setIsLoading(false));
        if (res.success && res.roomId) {
            dispatch(enterRoom({ roomId: res.roomId, status: res.status ?? "open", hasMore: res.hasMore }));
            // History arrives with the join: a separate "chat-history" event can
            // reach us before the room is active and would be dropped
            if (res.messages) dispatch(setMessages({ roomId: res.roomId, messages: res.messages, hasMore: res.hasMore }));
            socketService.send("message-read", { roomId: res.roomId });
        } else {
            toast.error(res.error || "Could not open the conversation");
        }
    };

    // On open / reconnect: customers enter their conversation; admins see the inbox
    // (or go straight to the conversation from a notification)
    useEffect(() => {
        if (!connected) return;
        if (isAdmin) {
            if (pendingRoomId) {
                joinRoom(pendingRoomId);
                dispatch(clearPendingRoom());
            } else if (!activeRoomId) {
                refreshRooms();
            }
        } else if (!activeRoomId) {
            joinRoom();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected, isAdmin, pendingRoomId]);

    // Admin inbox filter changed
    useEffect(() => {
        if (isAdmin && connected && !activeRoomId) refreshRooms();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [roomFilter]);

    useEffect(() => () => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }, []);

    const stopTyping = () => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
        if (activeRoomId) socketService.send("stop-typing", { roomId: activeRoomId });
    };

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
        setInputMessage(e.target.value);
        if (!activeRoomId) return;
        if (!typingTimeoutRef.current) socketService.send("typing", { roomId: activeRoomId });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(stopTyping, 2000);
    };

    /** Send text and/or image; surfaces every failure to the user */
    const sendMessage = async (payload: { content?: string; attachments?: { type: "image"; url: string }[] }) => {
        if (!activeRoomId) return false;
        const res = await socketService.request("send-message", { roomId: activeRoomId, ...payload });
        if (res.success) return true;

        if (res.code === "ROOM_CLOSED") dispatch(roomClosed(activeRoomId));
        toast.error(res.error || "Message not sent");
        return false;
    };

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        const content = inputMessage.trim();
        if (!content || isSending) return;

        setIsSending(true);
        stopTyping();
        if (await sendMessage({ content })) setInputMessage("");
        setIsSending(false);
    };

    const handleImageSelected = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file || !activeRoomId) return;
        if (!file.type.startsWith("image/")) {
            toast.error("Please choose an image");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            toast.error("Images must be smaller than 5 MB");
            return;
        }

        const formData = new FormData();
        formData.append("image", file);
        setIsUploading(true);
        try {
            const guestToken = isAuthenticated ? undefined : loadGuestSession()?.token;
            const { data } = await api.post("/chat/upload", formData, {
                headers: {
                    "Content-Type": "multipart/form-data",
                    ...(guestToken && { "X-Chat-Guest-Token": guestToken }),
                },
            });
            const url: string | undefined = data?.data?.url ?? data?.url;
            if (!url) throw new Error("Upload failed");
            await sendMessage({ attachments: [{ type: "image", url }] });
        } catch (err) {
            toast.error(getErrorMessage(err, "Image upload failed"));
        } finally {
            setIsUploading(false);
        }
    };

    const handleBackToRooms = () => {
        stopTyping();
        socketService.request("leave-chat");
        dispatch(leaveRoom());
        refreshRooms();
    };

    const handleCloseConversation = async () => {
        if (!activeRoomId || !window.confirm("Close this conversation? The customer will start a new one next time.")) return;
        const res = await socketService.request("close-room", { roomId: activeRoomId });
        if (res.success) {
            toast.success("Conversation closed");
            handleBackToRooms();
        } else {
            toast.error(res.error || "Could not close the conversation");
        }
    };

    const handleStartNewConversation = () => {
        dispatch(leaveRoom());
        joinRoom();
    };

    const handleReconnect = () => {
        socketService.connect();
    };

    const showInbox = isAdmin && !activeRoomId;
    const customerName = activeRoom ? roomDisplayName(activeRoom) : undefined;
    const canWrite = connected && roomStatus === "open";

    return (
        <div
            className={
                embedded
                    ? "h-full bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] flex flex-col overflow-hidden"
                    : "fixed z-[60] inset-0 sm:inset-auto sm:bottom-20 sm:right-4 sm:w-[380px] sm:h-[min(560px,calc(100vh-7rem))] bg-[var(--color-surface)] sm:rounded-2xl shadow-[var(--shadow-lg)] flex flex-col overflow-hidden sm:border border-[var(--color-border)] pb-[env(safe-area-inset-bottom)] animate-slideUp"
            }
            role={embedded ? "region" : "dialog"}
            aria-label="Support chat"
        >
            {/* Header */}
            <div className="bg-[var(--color-primary)] text-[var(--color-on-primary)] px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top))] sm:pt-3 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                    {isAdmin && activeRoomId && (
                        <button onClick={handleBackToRooms} className="mr-1 hover:bg-white/15 rounded-full p-1" aria-label="Back to conversations">
                            <ChevronLeft size={20} />
                        </button>
                    )}
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center shrink-0" aria-hidden="true">
                        {showInbox ? <User size={18} /> : "💬"}
                    </div>
                    <div className="min-w-0">
                        <h3 className="font-semibold text-sm truncate">
                            {showInbox ? "Conversations" : isAdmin ? customerName || "Customer" : "Support Chat"}
                        </h3>
                        {needsGuestStart || (!isAdmin && connected) ? (
                            <span className="text-xs opacity-90 block truncate">{CONTACT.replyTime}</span>
                        ) : (
                            <div className="flex items-center gap-1">
                                <span
                                    className={`w-2 h-2 rounded-full ${connected ? "bg-green-400" : connectionStatus === "connecting" ? "bg-yellow-400 animate-pulse" : "bg-red-400"}`}
                                />
                                <span className="text-xs opacity-80 capitalize">{connectionStatus}</span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-1">
                    {isAdmin && activeRoomId && roomStatus === "open" && (
                        <button
                            onClick={handleCloseConversation}
                            className="p-1.5 hover:bg-white/15 rounded-lg transition-colors"
                            title="Close conversation"
                            aria-label="Close conversation"
                        >
                            <CheckCircle2 size={18} />
                        </button>
                    )}
                    {!needsGuestStart && (connectionStatus === "error" || connectionStatus === "disconnected") && (
                        <button onClick={handleReconnect} className="p-1.5 hover:bg-white/15 rounded-lg transition-colors" title="Reconnect" aria-label="Reconnect">
                            <RefreshCw size={18} />
                        </button>
                    )}
                    {!embedded && (
                        <button onClick={() => dispatch(setIsOpen(false))} className="p-2 hover:bg-white/15 rounded-lg transition-colors" aria-label="Close chat window">
                            <X size={18} />
                        </button>
                    )}
                </div>
            </div>

            {needsGuestStart ? (
                <GuestChatStart />
            ) : showInbox ? (
                <>
                    {/* Admin inbox */}
                    <div className="flex border-b border-[var(--color-border)] text-sm">
                        {(["open", "closed"] as const).map((filter) => (
                            <button
                                key={filter}
                                onClick={() => dispatch(setRoomFilter(filter))}
                                className={`flex-1 py-2 capitalize ${roomFilter === filter ? "border-b-2 border-[var(--color-primary)] font-medium text-[var(--color-primary)]" : "text-[var(--color-text-muted)]"}`}
                            >
                                {filter}
                            </button>
                        ))}
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {rooms.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-sm">
                                <p>{roomFilter === "open" ? "No open conversations" : "No closed conversations"}</p>
                            </div>
                        ) : (
                            rooms.map((room) => (
                                <button
                                    key={room._id}
                                    onClick={() => joinRoom(room._id)}
                                    className="w-full text-left p-3 mb-2 rounded-lg bg-[var(--color-surface-muted)] hover:bg-[var(--color-primary-soft)] transition-colors border border-[var(--color-border)]"
                                >
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <span className="font-medium text-sm text-[var(--color-text)] truncate">
                                            {roomDisplayName(room)}
                                        </span>
                                        <span className="text-xs text-[var(--color-text-muted)] shrink-0">{formatRoomTime(room.lastMessageAt)}</span>
                                    </div>
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs text-[var(--color-text-muted)] truncate">
                                            {room.lastMessagePreview || room.customerId?.email || room.guestEmail}
                                        </p>
                                        {room.unreadCountAdmin > 0 && (
                                            <span className="shrink-0 px-2 py-0.5 text-xs font-bold text-white bg-red-700 rounded-full">
                                                {room.unreadCountAdmin}
                                            </span>
                                        )}
                                    </div>
                                    {room.adminId?.name && (
                                        <p className="text-[11px] text-[var(--color-text-muted)] mt-1">Last reply: {room.adminId.name}</p>
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </>
            ) : (
                <>
                    <MessageList customerName={isAdmin ? customerName : undefined} />

                    {typing && (
                        <div className="px-4 py-1 text-xs text-[var(--color-text-muted)] italic animate-pulse">
                            {typing.role === "admin" ? (isAdmin ? "Another admin" : "Support") : customerName || "Customer"} is typing...
                        </div>
                    )}

                    {roomStatus === "closed" ? (
                        <div className="p-3 border-t border-[var(--color-border)] text-center text-sm text-[var(--color-text-muted)]">
                            This conversation has been closed.
                            {!isAdmin && (
                                <button onClick={handleStartNewConversation} className="block mx-auto mt-2 text-[var(--color-primary)] font-medium hover:underline">
                                    Start a new conversation
                                </button>
                            )}
                        </div>
                    ) : (
                        <form onSubmit={handleSendMessage} className="p-3 border-t border-[var(--color-border)] bg-[var(--color-surface)]">
                            <div className="flex gap-2 items-end">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handleImageSelected}
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="p-2 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] rounded-full transition-colors disabled:opacity-50"
                                    disabled={!canWrite || isUploading}
                                    title="Send image"
                                    aria-label="Send image"
                                >
                                    {isUploading ? <Loader2 size={20} className="animate-spin" /> : <ImageIcon size={20} />}
                                </button>

                                <input
                                    type="text"
                                    value={inputMessage}
                                    onChange={handleInputChange}
                                    placeholder="Type a message..."
                                    maxLength={MAX_MESSAGE_LENGTH}
                                    className="flex-1 min-w-0 px-4 py-2.5 rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] border-0 outline-none focus:ring-2 focus:ring-[var(--color-primary)] text-base sm:text-sm"
                                    disabled={!canWrite}
                                    aria-label="Message"
                                />
                                <button
                                    type="submit"
                                    disabled={!inputMessage.trim() || isSending || !canWrite}
                                    className="p-2.5 bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-full hover:bg-[var(--color-primary-dark)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Send message"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </form>
                    )}
                </>
            )}
            {/* Screen-reader announcement for new messages */}
            <span className="sr-only" aria-live="polite">
                {messages.length > 0 ? `${messages.length} messages` : ""}
            </span>
        </div>
    );
};

export default ChatWindow;
