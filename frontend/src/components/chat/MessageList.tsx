/**
 * MessageList Component
 * Scrollable message history: auto-scrolls on new messages, keeps position when
 * older messages are loaded above.
 */
import { useLayoutEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { prependMessages, setLoadingOlder, ChatMessage } from "../../store/chatSlice";
import socketService, { AckResponse } from "../../services/socketService";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
    customerName?: string;
}

const MessageList = ({ customerName }: MessageListProps) => {
    const dispatch = useAppDispatch();
    const { messages, isLoading, hasMore, loadingOlder, activeRoomId } = useAppSelector((state) => state.chat);
    const { user, isAuthenticated } = useAuth();
    const guestId = useAppSelector((state) => state.chat.guest?.id);
    const selfId = isAuthenticated ? user?._id : guestId;
    const containerRef = useRef<HTMLDivElement>(null);
    const lastMessageIdRef = useRef<string | undefined>(undefined);
    const scrollAnchorRef = useRef<{ height: number; top: number } | null>(null);

    // New message at the bottom → scroll down; older messages prepended → keep position
    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const anchor = scrollAnchorRef.current;
        if (anchor) {
            el.scrollTop = el.scrollHeight - anchor.height + anchor.top;
            scrollAnchorRef.current = null;
        } else if (messages.at(-1)?._id !== lastMessageIdRef.current) {
            el.scrollTop = el.scrollHeight;
        }
        lastMessageIdRef.current = messages.at(-1)?._id;
    }, [messages]);

    const loadOlder = async () => {
        if (!activeRoomId || !messages[0] || loadingOlder) return;
        const el = containerRef.current;
        if (el) scrollAnchorRef.current = { height: el.scrollHeight, top: el.scrollTop };

        dispatch(setLoadingOlder(true));
        const res = await socketService.request<AckResponse & { messages?: ChatMessage[]; hasMore?: boolean }>(
            "load-messages",
            { roomId: activeRoomId, before: messages[0].createdAt },
        );
        dispatch(setLoadingOlder(false));
        if (res.success && res.messages) {
            dispatch(prependMessages({ roomId: activeRoomId, messages: res.messages, hasMore: Boolean(res.hasMore) }));
        } else {
            scrollAnchorRef.current = null;
        }
    };

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--color-primary)]"></div>
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-[var(--color-text-muted)]">
                <div className="text-center">
                    <div className="text-4xl mb-2">💬</div>
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                </div>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 space-y-1">
            {hasMore && (
                <div className="text-center mb-3">
                    <button
                        onClick={loadOlder}
                        disabled={loadingOlder}
                        className="text-xs text-[var(--color-primary)] hover:underline disabled:opacity-50"
                    >
                        {loadingOlder ? "Loading..." : "Load earlier messages"}
                    </button>
                </div>
            )}
            {messages.map((message) => (
                <MessageBubble
                    key={message._id}
                    content={message.content}
                    isOwn={message.senderId === selfId}
                    timestamp={message.createdAt}
                    senderLabel={
                        message.senderRole === "admin" ? "Support" : customerName || "Customer"
                    }
                    status={message.status}
                    attachments={message.attachments}
                />
            ))}
        </div>
    );
};

export default MessageList;
