/**
 * Socket.IO Configuration
 * Real-time support chat (namespace /chat) with JWT authentication.
 *
 * Model: each customer has at most one open ChatRoom; all admins share the inbox
 * and any admin may reply. Sockets join:
 *   user:<id>   every socket of a user (badge updates, forced disconnects)
 *   admins      every admin socket (inbox updates)
 *   room:<id>   the conversation currently open in that socket (one at a time)
 */
import { Server as HttpServer } from "http";
import { Server, Socket, Namespace } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { RateLimiterMemory } from "rate-limiter-flexible";
import mongoose from "mongoose";
import { verifyAccessToken } from "../utils/tokenUtils";
import User from "../models/User";
import ChatRoom, { IChatRoom } from "../models/ChatRoom";
import Message, { IMessage } from "../models/Message";
import Notification from "../models/Notification";
import { sendPushNotification } from "../services/pushNotificationService";
import { registerChatNamespace } from "./socketRegistry";

// Extended socket interface with user data
interface AuthenticatedSocket extends Socket {
    userId: string;
    userRole: "customer" | "admin";
}

type AckResponse = { success: boolean; error?: string; [key: string]: unknown };
type Ack = (response: AckResponse) => void;

const MAX_MESSAGE_LENGTH = 2000;
const MAX_ATTACHMENTS = 5;
const HISTORY_PAGE_SIZE = 50;
const ROOM_LIST_LIMIT = 100;

// In-memory connection tracking (Fallback / Local only)
const userConnections = new Map<string, Set<string>>(); // userId -> Set of socketIds

// Redis client for production connection tracking
let redisClient: Redis | null = null;
const REDIS_CONNECTION_PREFIX = "socket:connections:";

const addConnection = async (userId: string, socketId: string): Promise<void> => {
    if (redisClient) {
        try {
            await redisClient.sadd(`${REDIS_CONNECTION_PREFIX}${userId}`, socketId);
        } catch (error) {
            console.error("Redis addConnection error:", error);
        }
    }
    if (!userConnections.has(userId)) {
        userConnections.set(userId, new Set());
    }
    userConnections.get(userId)!.add(socketId);
};

const removeConnection = async (userId: string, socketId: string): Promise<void> => {
    if (redisClient) {
        try {
            await redisClient.srem(`${REDIS_CONNECTION_PREFIX}${userId}`, socketId);
        } catch (error) {
            console.error("Redis removeConnection error:", error);
        }
    }
    const userSockets = userConnections.get(userId);
    if (userSockets) {
        userSockets.delete(socketId);
        if (userSockets.size === 0) {
            userConnections.delete(userId);
        }
    }
};

// Rate Limiter: 10 messages per second per user
const rateLimiter = new RateLimiterMemory({
    points: 10,
    duration: 1,
});

/**
 * Plain-text message content. React / React Native render text safely, so the
 * content is stored as typed (no HTML escaping, which used to turn "<3" into
 * "&lt;3"); only control characters other than newline/tab are removed.
 */
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g;
const cleanContent = (value: unknown): string =>
    typeof value === "string" ? value.replace(CONTROL_CHARS, "").trim() : "";

/** Only images uploaded through /chat/upload (this shop's Cloudinary account) */
const isAllowedAttachmentUrl = (url: unknown): url is string => {
    const cloud = process.env.CLOUDINARY_CLOUD_NAME;
    return (
        typeof url === "string" &&
        !!cloud &&
        url.startsWith(`https://res.cloudinary.com/${cloud}/`) &&
        url.length <= 500
    );
};

const isObjectId = (value: unknown): value is string =>
    typeof value === "string" && mongoose.Types.ObjectId.isValid(value);

const toMessagePayload = (message: IMessage | any) => ({
    _id: String(message._id),
    roomId: String(message.roomId),
    senderId: String(message.senderId),
    senderRole: message.senderRole,
    content: message.content || "",
    attachments: (message.attachments || []).map((att: any) => ({ type: att.type, url: att.url })),
    status: message.status,
    createdAt: message.createdAt,
});

const previewOf = (content: string, attachmentCount: number): string =>
    content ? content.slice(0, 120) : attachmentCount > 0 ? "📷 Photo" : "";

/** Unread total for a user's badge: customer → their open room, admin → whole inbox */
const getUnreadCount = async (userId: string, role: "customer" | "admin"): Promise<number> => {
    if (role === "customer") {
        const room = await ChatRoom.findOne({ customerId: userId, status: "open" }).select("unreadCountCustomer");
        return room?.unreadCountCustomer || 0;
    }
    const [result] = await ChatRoom.aggregate([
        { $match: { status: "open" } },
        { $group: { _id: null, total: { $sum: "$unreadCountAdmin" } } },
    ]);
    return result?.total || 0;
};

/** Room list for the admin inbox */
const listRooms = async (status: "open" | "closed" = "open") =>
    ChatRoom.find({ status })
        .populate("customerId", "name email")
        .populate("adminId", "name")
        .sort({ lastMessageAt: -1, updatedAt: -1 })
        .limit(ROOM_LIST_LIMIT)
        .lean();

/** Find a customer's open room or create it; safe if two tabs connect at once */
const findOrCreateCustomerRoom = async (customerId: string): Promise<IChatRoom> => {
    const existing = await ChatRoom.findOne({ customerId, status: "open" });
    if (existing) return existing;
    try {
        return await ChatRoom.create({ customerId, status: "open" });
    } catch (error: any) {
        // Unique index "one open room per customer": another connection created it first
        if (error?.code === 11000) {
            const room = await ChatRoom.findOne({ customerId, status: "open" });
            if (room) return room;
        }
        throw error;
    }
};

/** Can this socket read/write this room? Customers: own room; admins: any room */
const canAccessRoom = (room: IChatRoom, userId: string, role: string): boolean =>
    role === "admin" || room.customerId.toString() === userId;

const loadHistory = async (roomId: string, before?: Date) => {
    const query: Record<string, unknown> = { roomId };
    if (before) query.createdAt = { $lt: before };
    const page = await Message.find(query)
        .sort({ createdAt: -1, _id: -1 })
        .limit(HISTORY_PAGE_SIZE + 1)
        .lean();
    const hasMore = page.length > HISTORY_PAGE_SIZE;
    return {
        messages: page.slice(0, HISTORY_PAGE_SIZE).reverse().map(toMessagePayload),
        hasMore,
    };
};

/**
 * Bell/push notification for a chat message to a user who isn't connected.
 * One unread notification per conversation: later messages update it instead of
 * adding another bell entry, and only the first one sends a push.
 */
const notifyOffline = async (
    recipientId: string,
    title: string,
    body: string,
    data: { type: "chat_message"; roomId: string; senderRole: string },
): Promise<void> => {
    if (await isUserOnline(recipientId)) return;

    const updated = await Notification.findOneAndUpdate(
        { userId: recipientId, type: "chat_message", "data.roomId": data.roomId, isRead: false },
        { $set: { title, body, data } },
    );
    if (updated) return;

    await Notification.create({ userId: recipientId, type: "chat_message", title, body, data });
    await sendPushNotification(recipientId, title, body, data, {
        channelId: "chat",
        sound: "default",
        skipPersist: true,
    });
};

/**
 * Initialize Socket.IO server with the HTTP server
 */
export const initializeSocket = (httpServer: HttpServer): Server => {
    const io = new Server(httpServer, {
        cors: {
            origin: process.env.ALLOWED_ORIGINS?.split(",") || [
                "http://localhost:5173",
                "http://localhost:8081",
            ],
            credentials: true,
        },
        path: "/socket.io",
    });

    // Redis Adapter Setup
    if (process.env.REDIS_URL) {
        try {
            const pubClient = new Redis(process.env.REDIS_URL);
            const subClient = pubClient.duplicate();
            redisClient = pubClient;
            io.adapter(createAdapter(pubClient, subClient));
            console.log("✅ Redis Adapter initialized for Socket.IO");
        } catch (error) {
            console.error("❌ Failed to initialize Redis Adapter:", error);
        }
    } else if (process.env.NODE_ENV !== "test") {
        console.log("⚠️ No REDIS_URL found. Using default in-memory adapter (Single Instance Mode).");
    }

    const chatNamespace: Namespace = io.of("/chat");
    registerChatNamespace(chatNamespace);

    /** Push fresh badge counts: one customer, and/or every admin (shared inbox) */
    const emitUnread = async (target: { customerId?: string; admins?: boolean }) => {
        if (target.customerId) {
            const count = await getUnreadCount(target.customerId, "customer");
            chatNamespace.to(`user:${target.customerId}`).emit("unread-updated", { count });
        }
        if (target.admins) {
            const count = await getUnreadCount("", "admin");
            chatNamespace.to("admins").emit("unread-updated", { count });
            chatNamespace.to("admins").emit("rooms-updated");
        }
    };

    // Authentication middleware
    chatNamespace.use(async (socket: Socket, next) => {
        try {
            const token = socket.handshake.auth.token;
            if (!token) {
                return next(new Error("Authentication required"));
            }

            const decoded = verifyAccessToken(token);
            const user = await User.findById(decoded.userId);
            if (!user || !user.isActive) {
                return next(new Error("User not found or inactive"));
            }

            (socket as AuthenticatedSocket).userId = user._id.toString();
            (socket as AuthenticatedSocket).userRole = user.role as "customer" | "admin";
            next();
        } catch {
            next(new Error("Invalid or expired token"));
        }
    });

    chatNamespace.on("connection", async (socket: Socket) => {
        const { userId, userRole } = socket as AuthenticatedSocket;

        socket.join(`user:${userId}`);
        if (userRole === "admin") socket.join("admins");
        await addConnection(userId, socket.id);

        const leaveAllRooms = () => {
            for (const name of [...socket.rooms]) {
                if (name.startsWith("room:")) socket.leave(name);
            }
        };

        const isInRoom = (roomId: unknown): roomId is string =>
            typeof roomId === "string" && socket.rooms.has(`room:${roomId}`);

        // ==================== JOIN CHAT ====================
        // Customer: opens (or creates) their own room. Admin: opens the given room.
        socket.on("join-chat", async (data: { roomId?: string } | undefined, callback?: Ack) => {
            try {
                let room: IChatRoom | null = null;

                if (userRole === "customer") {
                    room = await findOrCreateCustomerRoom(userId);
                } else if (isObjectId(data?.roomId)) {
                    room = await ChatRoom.findById(data!.roomId);
                }

                if (!room || !canAccessRoom(room, userId, userRole)) {
                    return callback?.({ success: false, error: "Unable to join chat room" });
                }

                // An admin switching conversations must stop receiving the previous one
                leaveAllRooms();
                socket.join(`room:${room._id}`);

                const history = await loadHistory(String(room._id));
                socket.emit("chat-history", { roomId: String(room._id), ...history });

                callback?.({
                    success: true,
                    roomId: String(room._id),
                    status: room.status,
                    hasMore: history.hasMore,
                });
            } catch (error: any) {
                console.error("join-chat error:", error.message);
                callback?.({ success: false, error: "Failed to join chat" });
            }
        });

        // ==================== LEAVE CHAT ====================
        socket.on("leave-chat", (_data: unknown, callback?: Ack) => {
            leaveAllRooms();
            callback?.({ success: true });
        });

        // ==================== OLDER MESSAGES ====================
        socket.on("load-messages", async (data: { roomId?: string; before?: string }, callback?: Ack) => {
            try {
                if (!isInRoom(data?.roomId)) {
                    return callback?.({ success: false, error: "Join the conversation first" });
                }
                const before = data.before ? new Date(data.before) : undefined;
                if (before && Number.isNaN(before.getTime())) {
                    return callback?.({ success: false, error: "Invalid cursor" });
                }
                const page = await loadHistory(data.roomId!, before);
                callback?.({ success: true, ...page });
            } catch (error: any) {
                console.error("load-messages error:", error.message);
                callback?.({ success: false, error: "Failed to load messages" });
            }
        });

        // ==================== SEND MESSAGE ====================
        socket.on("send-message", async (data: any, callback?: Ack) => {
            try {
                try {
                    await rateLimiter.consume(userId);
                } catch {
                    return callback?.({ success: false, error: "You're sending messages too fast. Please slow down." });
                }

                const roomId = data?.roomId;
                const content = cleanContent(data?.content);
                const attachments = Array.isArray(data?.attachments)
                    ? data.attachments
                        .filter((att: any) => att?.type === "image" && isAllowedAttachmentUrl(att.url))
                        .slice(0, MAX_ATTACHMENTS)
                        .map((att: any) => ({ type: "image" as const, url: att.url as string }))
                    : [];

                if (Array.isArray(data?.attachments) && data.attachments.length > 0 && attachments.length === 0) {
                    return callback?.({ success: false, error: "Images must be uploaded through the chat" });
                }
                if (!content && attachments.length === 0) {
                    return callback?.({ success: false, error: "Message is empty" });
                }
                if (content.length > MAX_MESSAGE_LENGTH) {
                    return callback?.({ success: false, error: `Messages can be at most ${MAX_MESSAGE_LENGTH} characters` });
                }
                if (!isObjectId(roomId)) {
                    return callback?.({ success: false, error: "Room not found" });
                }

                // Accounts deactivated after connecting can't keep chatting
                const sender = await User.findById(userId).select("name isActive");
                if (!sender?.isActive) {
                    callback?.({ success: false, error: "Your account is not active" });
                    socket.disconnect(true);
                    return;
                }

                const room = await ChatRoom.findById(roomId);
                if (!room || !canAccessRoom(room, userId, userRole)) {
                    return callback?.({ success: false, error: "Access denied" });
                }
                if (room.status === "closed") {
                    return callback?.({
                        success: false,
                        error: "This conversation has been closed. Start a new one to continue.",
                        code: "ROOM_CLOSED",
                    });
                }

                const message = await Message.create({
                    roomId: room._id,
                    senderId: userId,
                    senderRole: userRole,
                    content,
                    ...(attachments.length > 0 && { attachments }),
                });

                room.lastMessageAt = message.createdAt;
                room.lastMessagePreview = previewOf(content, attachments.length);
                if (userRole === "customer") {
                    room.unreadCountAdmin = (room.unreadCountAdmin || 0) + 1;
                } else {
                    room.unreadCountCustomer = (room.unreadCountCustomer || 0) + 1;
                    room.adminId = userId as any; // most recent responder
                }
                await room.save();

                const payload = toMessagePayload(message);
                chatNamespace.to(`room:${room._id}`).emit("new-message", payload);
                callback?.({ success: true, message: payload });

                const customerId = room.customerId.toString();
                if (userRole === "customer") {
                    await emitUnread({ admins: true });
                } else {
                    await emitUnread({ customerId });
                    chatNamespace.to("admins").emit("rooms-updated");
                }

                // Bell/push for recipients who aren't connected
                try {
                    const title = `New message from ${sender.name || (userRole === "admin" ? "Support" : "Customer")}`;
                    const body = room.lastMessagePreview || "";
                    const notifData = { type: "chat_message" as const, roomId: String(room._id), senderRole: userRole };

                    if (userRole === "admin") {
                        await notifyOffline(customerId, title, body, notifData);
                    } else {
                        const admins = await User.find({ role: "admin", isActive: true }).select("_id");
                        await Promise.all(
                            admins.map((admin) => notifyOffline(String(admin._id), title, body, notifData)),
                        );
                    }
                } catch (notifyError) {
                    console.error("Failed to send chat notification:", notifyError);
                }
            } catch (error: any) {
                console.error("send-message error:", error.message);
                callback?.({ success: false, error: "Failed to send message" });
            }
        });

        // ==================== TYPING INDICATORS ====================
        socket.on("typing", (data) => {
            const roomId = data?.roomId;
            if (!isInRoom(roomId)) return;
            socket.to(`room:${roomId}`).emit("typing", { roomId, userId, userRole });
        });

        socket.on("stop-typing", (data) => {
            const roomId = data?.roomId;
            if (!isInRoom(roomId)) return;
            socket.to(`room:${roomId}`).emit("stop-typing", { roomId, userId });
        });

        // ==================== MESSAGE READ ====================
        // Marks every message from the other side of the conversation as read
        socket.on("message-read", async (data) => {
            try {
                const roomId = data?.roomId;
                if (!isInRoom(roomId)) return;

                const readAt = new Date();
                const otherRole = userRole === "customer" ? "admin" : "customer";
                await Message.updateMany(
                    { roomId, senderRole: otherRole, status: { $ne: "read" } },
                    { $set: { status: "read", readAt } },
                );

                const room = await ChatRoom.findByIdAndUpdate(
                    roomId,
                    { $set: userRole === "customer" ? { unreadCountCustomer: 0 } : { unreadCountAdmin: 0 } },
                    { new: true },
                );
                if (!room) return;

                // Read receipts for the other side's ticks
                socket.to(`room:${roomId}`).emit("message-read", { roomId, readerRole: userRole, readAt });

                if (userRole === "customer") {
                    await emitUnread({ customerId: userId });
                } else {
                    await emitUnread({ admins: true });
                }
            } catch (error: any) {
                console.error("message-read error:", error.message);
            }
        });

        // ==================== UNREAD COUNT (badge) ====================
        socket.on("get-unread", async (dataOrCallback: unknown, maybeCallback?: Ack) => {
            // Supports emit("get-unread", cb) and emit("get-unread", data, cb)
            const callback = (typeof dataOrCallback === "function" ? dataOrCallback : maybeCallback) as Ack | undefined;
            try {
                callback?.({ success: true, count: await getUnreadCount(userId, userRole) });
            } catch {
                callback?.({ success: false, error: "Failed to load unread count" });
            }
        });

        // ==================== ROOMS (Admin only) ====================
        socket.on("get-rooms", async (dataOrCallback: unknown, maybeCallback?: Ack) => {
            // Supports emit("get-rooms", cb) and emit("get-rooms", { status }, cb)
            const callback = (typeof dataOrCallback === "function" ? dataOrCallback : maybeCallback) as Ack | undefined;
            const status = (dataOrCallback as { status?: string } | undefined)?.status === "closed" ? "closed" : "open";
            try {
                if (userRole !== "admin") {
                    return callback?.({ success: false, error: "Admin only" });
                }
                callback?.({ success: true, rooms: await listRooms(status) });
            } catch (error: any) {
                console.error("get-rooms error:", error.message);
                callback?.({ success: false, error: "Failed to get rooms" });
            }
        });

        // ==================== CLOSE CONVERSATION (Admin only) ====================
        socket.on("close-room", async (data: { roomId?: string }, callback?: Ack) => {
            try {
                if (userRole !== "admin") {
                    return callback?.({ success: false, error: "Admin only" });
                }
                if (!isObjectId(data?.roomId)) {
                    return callback?.({ success: false, error: "Room not found" });
                }
                const room = await ChatRoom.findOneAndUpdate(
                    { _id: data.roomId, status: "open" },
                    {
                        $set: {
                            status: "closed",
                            closedAt: new Date(),
                            closedBy: userId,
                            unreadCountAdmin: 0,
                        },
                    },
                    { new: true },
                );
                if (!room) {
                    return callback?.({ success: false, error: "Conversation is already closed" });
                }

                chatNamespace.to(`room:${room._id}`).emit("room-closed", { roomId: String(room._id) });
                callback?.({ success: true });
                await emitUnread({ customerId: room.customerId.toString(), admins: true });
            } catch (error: any) {
                console.error("close-room error:", error.message);
                callback?.({ success: false, error: "Failed to close conversation" });
            }
        });

        // ==================== DISCONNECT ====================
        socket.on("disconnect", async () => {
            await removeConnection(userId, socket.id);
        });
    });

    if (process.env.NODE_ENV !== "test") {
        console.log("🔌 Socket.IO initialized with /chat namespace");
    }

    return io;
};

/**
 * Check if a user is currently connected
 * Checks Redis first if available, falls back to local Map
 */
export const isUserOnline = async (userId: string): Promise<boolean> => {
    if (redisClient) {
        try {
            const count = await redisClient.scard(`${REDIS_CONNECTION_PREFIX}${userId}`);
            return count > 0;
        } catch (error) {
            console.error("Redis isUserOnline error:", error);
        }
    }
    return userConnections.has(userId) && userConnections.get(userId)!.size > 0;
};

/**
 * Get all socket IDs for a user
 * Checks Redis first if available, falls back to local Map
 */
export const getUserSockets = async (userId: string): Promise<string[]> => {
    if (redisClient) {
        try {
            return await redisClient.smembers(`${REDIS_CONNECTION_PREFIX}${userId}`);
        } catch (error) {
            console.error("Redis getUserSockets error:", error);
        }
    }
    return Array.from(userConnections.get(userId) || []);
};
