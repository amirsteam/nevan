/**
 * ChatRoom Model
 * A support conversation between one customer — a signed-in user or an anonymous
 * website visitor ("guest") — and the shop's admins (shared inbox).
 */
import mongoose, { Schema, Document, Types } from "mongoose";

export interface IChatRoom extends Document {
    _id: Types.ObjectId;
    // Signed-in customer; absent for guest conversations
    customerId?: Types.ObjectId;
    // Anonymous visitor (see /chat/guest-session); absent for signed-in customers
    guestId?: Types.ObjectId;
    guestName?: string;
    guestEmail?: string;
    // Last time an offline guest was emailed about a reply (throttling)
    guestNotifiedAt?: Date;
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
            required: function (this: IChatRoom) {
                return !this.guestId;
            },
        },
        guestId: Schema.Types.ObjectId,
        guestName: { type: String, trim: true, maxlength: 50 },
        guestEmail: { type: String, trim: true, lowercase: true, maxlength: 254 },
        guestNotifiedAt: Date,
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

// At most one open conversation per customer / guest (closed ones are kept as history).
// Each filter requires the id to be present, so guest rooms don't collide on a
// missing customerId and vice versa.
chatRoomSchema.index(
    { customerId: 1 },
    {
        unique: true,
        partialFilterExpression: { status: "open", customerId: { $type: "objectId" } },
        name: "one_open_room_per_signed_in_customer",
    },
);
chatRoomSchema.index(
    { guestId: 1 },
    {
        unique: true,
        partialFilterExpression: { status: "open", guestId: { $type: "objectId" } },
        name: "one_open_room_per_guest",
    },
);

// Admin inbox: open rooms by most recent activity
chatRoomSchema.index({ status: 1, lastMessageAt: -1 });

const ChatRoom = mongoose.model<IChatRoom>("ChatRoom", chatRoomSchema);
export default ChatRoom;
