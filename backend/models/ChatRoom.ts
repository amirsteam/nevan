/**
 * ChatRoom Model
 * A support conversation between one customer and the shop's admins (shared inbox).
 */
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IChatRoom extends Document {
    _id: Types.ObjectId;
    customerId: Types.ObjectId;
    // Admin who replied most recently (any admin may reply)
    adminId?: Types.ObjectId;
    status: "open" | "closed";
    unreadCountCustomer: number;
    unreadCountAdmin: number;
    lastMessageAt?: Date;
    lastMessagePreview?: string;
    closedAt?: Date;
    closedBy?: Types.ObjectId;
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
        unreadCountCustomer: {
            type: Number,
            default: 0,
        },
        unreadCountAdmin: {
            type: Number,
            default: 0,
        },
        lastMessageAt: {
            type: Date,
        },
        lastMessagePreview: {
            type: String,
            maxlength: 120,
        },
        closedAt: Date,
        closedBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
        },
    },
    { timestamps: true }
);

// At most one open conversation per customer (closed ones are kept as history)
chatRoomSchema.index(
    { customerId: 1 },
    { unique: true, partialFilterExpression: { status: "open" }, name: "one_open_room_per_customer" },
);

// Admin inbox: open rooms by most recent activity
chatRoomSchema.index({ status: 1, lastMessageAt: -1 });

const ChatRoom = mongoose.model<IChatRoom>("ChatRoom", chatRoomSchema);
export default ChatRoom;
