/**
 * MessageBubble Component
 * Individual chat message with left/right alignment
 */
interface MessageBubbleProps {
    content: string;
    isOwn: boolean;
    timestamp: string;
    senderRole: "customer" | "admin";
}

const MessageBubble = ({
    content,
    isOwn,
    timestamp,
    senderRole,
}: MessageBubbleProps) => {
    const formattedTime = new Date(timestamp).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
    });

    return (
        <div className={`flex ${isOwn ? "justify-end" : "justify-start"} mb-3`}>
            <div
                className={`max-w-[75%] rounded-2xl px-4 py-2 ${isOwn
                        ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-md"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md"
                    }`}
            >
                {!isOwn && (
                    <div className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mb-1">
                        {senderRole === "admin" ? "Support" : "Customer"}
                    </div>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{content}</p>
                <div
                    className={`text-xs mt-1 ${isOwn ? "text-indigo-200" : "text-gray-400"
                        }`}
                >
                    {formattedTime}
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
