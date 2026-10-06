import { Check, CheckCheck } from "lucide-react";

interface MessageBubbleProps {
    content: string;
    isOwn: boolean;
    timestamp: string;
    senderLabel: string;
    status?: "sent" | "delivered" | "read";
    attachments?: { type: "image"; url: string }[];
}

const MessageBubble = ({
    content,
    isOwn,
    timestamp,
    senderLabel,
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
                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] rounded-br-md"
                    : "bg-[var(--color-surface-muted)] text-[var(--color-text)] rounded-bl-md"
                    }`}
            >
                {!isOwn && (
                    <div className="text-xs font-medium text-[var(--color-primary)] mb-1">
                        {senderLabel}
                    </div>
                )}
                {content && <p className="text-sm whitespace-pre-wrap break-words">{content}</p>}
                {attachments?.map((att, index) =>
                    att.type === "image" ? (
                        <a key={index} href={att.url} target="_blank" rel="noopener noreferrer" className={content ? "block mt-2" : "block"}>
                            <img src={att.url} alt="Shared image" className="rounded-lg max-w-full h-auto max-h-[200px] object-cover" />
                        </a>
                    ) : null,
                )}
                <div
                    className={`flex items-center justify-end gap-1 text-xs mt-1 ${isOwn ? "opacity-80" : "text-[var(--color-text-muted)]"}`}
                >
                    <span>{formattedTime}</span>
                    {isOwn && (
                        <span title={status === "read" ? "Read" : "Sent"} aria-label={status === "read" ? "Read" : "Sent"}>
                            {status === "read" ? <CheckCheck size={14} className="text-blue-300" /> : <Check size={14} />}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MessageBubble;
