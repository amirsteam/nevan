/**
 * ChatWidget Component
 * Floating chat button that opens/closes the chat window
 */
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MessageCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { RootState, AppDispatch } from "../../store";
import { toggleChat, clearChat } from "../../store/chatSlice";
import socketService from "../../services/socketService";
import ChatWindow from "./ChatWindow";

const ChatWidget = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { isOpen, unreadCount } = useSelector((state: RootState) => state.chat);
    const { isAuthenticated } = useAuth();

    // Handle logout (cleanup socket)
    useEffect(() => {
        if (!isAuthenticated) {
            if (socketService.isConnected()) {
                socketService.disconnect();
            }
            dispatch(clearChat());
        }
    }, [isAuthenticated, dispatch]);

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
                    : "bg-gradient-to-r from-indigo-600 to-purple-600 hover:opacity-90 animate-pulse hover:animate-none"
                    }`}
                aria-label={isOpen ? "Close chat" : "Open chat"}
            >
                <MessageCircle
                    size={24}
                    className={`text-white transition-transform ${isOpen ? "rotate-0" : ""}`}
                />

                {/* Unread Badge */}
                {!isOpen && unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full border-2 border-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}

                {/* Status Dot (only if no unread messages) */}
                {!isOpen && unreadCount === 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
            </button>

            {/* Chat Window */}
            {isOpen && <ChatWindow />}
        </>
    );
};

export default ChatWidget;
