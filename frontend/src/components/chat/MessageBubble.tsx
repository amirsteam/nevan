import { Check, CheckCheck } from "lucide-react";

interface MessageBubbleProps {
    content: string;
    isOwn: boolean;
    timestamp: string;
    senderRole: "customer" | "admin";
    status?: "sent" | "delivered" | "read";
    attachments?: { type: "image"; url: string }[];
}

const MessageBubble = ({
    content,
    isOwn,
    timestamp,
    senderRole,
    status = "sent",
    attachments,
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
                {/* Attachments */}
                {attachments?.map((att, index) => (
                    att.type === 'image' && (
                        <div key={index} className="mt-2">
                            <img src={att.url} alt="attachment" className="rounded-lg max-w-full h-auto max-h-[200px] object-cover" />
                        </div>
                    )
                ))}
                <div
                    className={`flex items-center justify-end gap-1 text-xs mt-1 ${isOwn ? "text-indigo-200" : "text-gray-400"
                        }`}
                >
                    <span>{formattedTime}</span>
                    {isOwn && (
                        <span title={status}>
                            {status === "read" ? (
                                <CheckCheck size={14} className="text-blue-300" />
                            ) : status === "delivered" ? (
                                <CheckCheck size={14} />
                            ) : (
                                <Check size={14} />
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
