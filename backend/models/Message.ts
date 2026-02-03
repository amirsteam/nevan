/**
 * Message Model
 * Represents a single chat message in a room
 */
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IMessage extends Document {
    _id: Types.ObjectId;
    roomId: Types.ObjectId;
    senderId: Types.ObjectId;
    senderRole: "customer" | "admin";
    content: string;
    createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
    {
        roomId: {
            type: Schema.Types.ObjectId,
            ref: "ChatRoom",
            required: true,
        },
        senderId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        senderRole: {
            type: String,
            enum: ["customer", "admin"],
            required: true,
        },
        content: {
            type: String,
            required: true,
            maxlength: 2000,
            trim: true,
        },
    },
    { timestamps: true }
);

// Compound index for efficient message history queries (pagination)
messageSchema.index({ roomId: 1, createdAt: -1 });

const Message = mongoose.model<IMessage>("Message", messageSchema);
export default Message;
