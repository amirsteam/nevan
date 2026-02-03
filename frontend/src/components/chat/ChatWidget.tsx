/**
 * ChatWidget Component
 * Floating chat button that opens/closes the chat window
 */
import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MessageCircle } from "lucide-react";
import { RootState, AppDispatch } from "../../store";
import { toggleChat, clearChat } from "../../store/chatSlice";
import socketService from "../../services/socketService";
import ChatWindow from "./ChatWindow";

const ChatWidget = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { isOpen } = useSelector((state: RootState) => state.chat);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isLoggedIn, setIsLoggedIn] = useState(false);

    // Check login status
    useEffect(() => {
        const token = localStorage.getItem("accessToken");
        const userId = localStorage.getItem("userId");
        setIsLoggedIn(!!token);
        setCurrentUserId(userId);

        // Listen for storage changes (login/logout)
        const handleStorageChange = () => {
            const newToken = localStorage.getItem("accessToken");
            const newUserId = localStorage.getItem("userId");
            setIsLoggedIn(!!newToken);
            setCurrentUserId(newUserId);

            // Clear chat state on logout
            if (!newToken) {
                socketService.disconnect();
                dispatch(clearChat());
            }
        };

        window.addEventListener("storage", handleStorageChange);
        return () => window.removeEventListener("storage", handleStorageChange);
    }, [dispatch]);

    // Disconnect socket when chat is closed
    useEffect(() => {
        if (!isOpen) {
            // Keep socket connected but don't disconnect immediately
            // This allows for reconnection without delay
        }
    }, [isOpen]);

    // Don't show chat widget if not logged in
    if (!isLoggedIn) {
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
                    className={`text-white transition-transform ${isOpen ? "rotate-0" : ""
                        }`}
                />
                {!isOpen && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
                )}
            </button>

            {/* Chat Window */}
            {isOpen && <ChatWindow currentUserId={currentUserId} />}
        </>
    );
};

export default ChatWidget;
