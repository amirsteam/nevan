/**
 * ChatWidget Component
 * Floating chat button (with unread badge) that opens/closes the chat window.
 * Also owns the chat connection, so the badge updates while the window is closed.
 */
import { MessageCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { toggleChat } from "../../store/chatSlice";
import { useChatConnection } from "../../hooks/useChatConnection";
import ChatWindow from "./ChatWindow";

const ChatWidget = () => {
    const dispatch = useAppDispatch();
    const { isOpen, unreadCount } = useAppSelector((state) => state.chat);
    const { isAuthenticated } = useAuth();

    useChatConnection();

    // Don't show chat widget if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => dispatch(toggleChat())}
                className={`fixed bottom-4 right-4 z-50 p-4 rounded-full shadow-lg transition-all duration-300 ${isOpen
                    ? "bg-gray-600 hover:bg-gray-700 scale-90"
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90"
                    }`}
                aria-label={
                    isOpen
                        ? "Close chat"
                        : unreadCount > 0
                            ? `Open chat, ${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`
                            : "Open chat"
                }
            >
                <MessageCircle size={24} className="text-white" />

                {/* Unread Badge */}
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-white">
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
