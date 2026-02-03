/**
 * ChatRoom Model
 * Represents a chat session between a customer and admin
 */
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IChatRoom extends Document {
    _id: Types.ObjectId;
    customerId: Types.ObjectId;
    adminId?: Types.ObjectId;
    status: "open" | "closed";
    lastMessageAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

const chatRoomSchema = new Schema<IChatRoom>(
    {
        customerId: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        adminId: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
        status: {
            type: String,
            enum: ["open", "closed"],
            default: "open",
        },
        lastMessageAt: {
            type: Date,
        },
    },
    { timestamps: true }
);

// Index for finding open chat room by customer (ensures single active room)
chatRoomSchema.index({ customerId: 1, status: 1 });

// Index for admin to list their assigned rooms
chatRoomSchema.index({ adminId: 1, status: 1 });

const ChatRoom = mongoose.model<IChatRoom>("ChatRoom", chatRoomSchema);
export default ChatRoom;
