/**
 * MessageList Component
 * Scrollable list of chat messages with auto-scroll
 */
import { useEffect, useRef } from "react";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import MessageBubble from "./MessageBubble";

interface MessageListProps {
    currentUserId: string | null;
}

const MessageList = ({ currentUserId }: MessageListProps) => {
    const { messages, isLoading } = useSelector(
        (state: RootState) => state.chat
    );
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    if (isLoading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    if (messages.length === 0) {
        return (
            <div className="flex-1 flex items-center justify-center text-gray-400">
                <div className="text-center">
                    <div className="text-4xl mb-2">💬</div>
                    <p>No messages yet</p>
                    <p className="text-sm">Start the conversation!</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {messages.map((message) => (
                <MessageBubble
                    key={message._id}
                    content={message.content}
                    isOwn={message.senderId === currentUserId}
                    timestamp={message.createdAt}
                    senderRole={message.senderRole}
                />
            ))}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default MessageList;
