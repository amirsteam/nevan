/**
 * ChatWidget Component
 * Floating chat button ("NEVAN" above the icon, unread badge) that opens/closes
 * the chat window.
 * Available to every visitor: signed-out visitors can chat as guests.
 * Also owns the chat connection, so the badge updates while the window is closed.
 */
import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { toggleChat } from "../../store/chatSlice";
import { useChatConnection } from "../../hooks/useChatConnection";
import ChatWindow from "./ChatWindow";
import { loadChatPicks } from "../../utils/chatPicks";

// Fields that bring up the on-screen keyboard
const TEXT_FIELD =
    'input:not([type="checkbox"]):not([type="radio"]):not([type="button"]):not([type="submit"]):not([type="range"]), textarea, select';

/** True while a text field has focus (the bubble would sit over it on phones) */
const useTextFieldFocused = (): boolean => {
    const [focused, setFocused] = useState(false);
    useEffect(() => {
        const onFocusIn = (e: FocusEvent) =>
            setFocused(e.target instanceof Element && e.target.matches(TEXT_FIELD));
        const onFocusOut = () => setFocused(false);
        document.addEventListener("focusin", onFocusIn);
        document.addEventListener("focusout", onFocusOut);
        return () => {
            document.removeEventListener("focusin", onFocusIn);
            document.removeEventListener("focusout", onFocusOut);
        };
    }, []);
    return focused;
};

const ChatWidget = () => {
    const dispatch = useAppDispatch();
    const { isOpen, unreadCount } = useAppSelector((state) => state.chat);

    useChatConnection();
    const typing = useTextFieldFocused();

    // The admin Live chat page shows the same inbox full size
    const { pathname } = useLocation();
    if (pathname.startsWith("/admin/chat")) return null;

    return (
        <>
            {/* Floating button: the shop's name above the chat icon (the name hides while the chat is open) */}
            <button
                type="button"
                onClick={() => dispatch(toggleChat())}
                onPointerEnter={() => void loadChatPicks()}
                onFocus={() => void loadChatPicks()}
                aria-expanded={isOpen}
                style={{ bottom: "calc(1rem + env(safe-area-inset-bottom) + var(--chat-offset, 0px))" }}
                className={`group fixed right-4 z-50 flex flex-col items-center gap-1.5 rounded-full ${isOpen ? "hidden sm:flex" : ""} ${typing && !isOpen ? "max-sm:hidden" : ""}`}
                aria-label={
                    isOpen
                        ? "Close chat"
                        : unreadCount > 0
                            ? `Chat with Nevan, ${unreadCount} unread message${unreadCount === 1 ? "" : "s"}`
                            : "Chat with Nevan"
                }
            >
                {!isOpen && (
                    <span
                        aria-hidden="true"
                        className="rounded-full bg-[var(--color-surface)] px-2.5 py-0.5 text-[11px] font-bold tracking-[0.22em] text-[var(--color-primary)] shadow-[var(--shadow-md)] ring-1 ring-[var(--color-border)] transition-transform group-hover:-translate-y-0.5"
                    >
                        NEVAN
                    </span>
                )}
                <span
                    className={`relative flex h-14 w-14 items-center justify-center rounded-full shadow-[var(--shadow-lg)] transition-all duration-300 ${isOpen
                        ? "bg-[var(--color-text)] text-[var(--color-surface)] scale-90"
                        : "bg-[var(--color-primary)] text-[var(--color-on-primary)] group-hover:bg-[var(--color-primary-dark)]"
                        }`}
                >
                    {isOpen ? <X size={22} aria-hidden="true" /> : <MessageCircle size={24} aria-hidden="true" />}

                    {/* Unread Badge */}
                    {!isOpen && unreadCount > 0 && (
                        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 bg-red-700 text-white text-xs font-bold rounded-full border-2 border-[var(--color-surface)]">
                            {unreadCount > 9 ? "9+" : unreadCount}
                        </span>
                    )}
                </span>
            </button>

            {/* Chat Window */}
            {isOpen && <ChatWindow />}
        </>
    );
};

export default ChatWidget;
