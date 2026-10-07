/**
 * ChatWidget Component
 * Floating chat button (with unread badge) that opens/closes the chat window.
 * Available to every visitor: signed-out visitors can chat as guests.
 * Also owns the chat connection, so the badge updates while the window is closed.
 */
import { MessageCircle } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { toggleChat } from "../../store/chatSlice";
import { useChatConnection } from "../../hooks/useChatConnection";
import ChatWindow from "./ChatWindow";

const ChatWidget = () => {
    const dispatch = useAppDispatch();
    const { isOpen, unreadCount } = useAppSelector((state) => state.chat);

    useChatConnection();

    // The admin Live chat page shows the same inbox full size
    const { pathname } = useLocation();
    if (pathname.startsWith("/admin/chat")) return null;

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => dispatch(toggleChat())}
                aria-expanded={isOpen}
                style={{ bottom: "calc(1rem + env(safe-area-inset-bottom) + var(--chat-offset, 0px))" }}
                className={`fixed right-4 z-50 p-4 rounded-full shadow-[var(--shadow-lg)] transition-all duration-300 ${isOpen
                    ? "hidden sm:block bg-[var(--color-text)] text-[var(--color-surface)] scale-90"
                    : "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-dark)]"
                    }`}
                aria-label={
                    isOpen
                        ? "Close chat"
                        : unreadCount > 0
                            ? `Open chat, ${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`
                            : "Open chat"
                }
            >
                <MessageCircle size={24} aria-hidden="true" />

                {/* Unread Badge */}
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 bg-red-700 text-white text-xs font-bold rounded-full border-2 border-[var(--color-surface)]">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {/* Chat Window */}
            {isOpen && <ChatWindow />}
        </>
    );
};

export default ChatWidget;
