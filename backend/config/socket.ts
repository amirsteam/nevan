/**
 * Socket.IO Configuration
 * Real-time chat server with JWT authentication
 */
import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import { Redis } from "ioredis";
import { RateLimiterMemory } from "rate-limiter-flexible";
import { verifyAccessToken } from "../utils/tokenUtils";
import User from "../models/User";
import ChatRoom from "../models/ChatRoom";
import Message, { IMessage } from "../models/Message";

// Extended socket interface with user data
interface AuthenticatedSocket extends Socket {
    userId: string;
    userRole: "customer" | "admin";
}

// In-memory connection tracking (Fallback / Local only)
const userConnections = new Map<string, Set<string>>(); // userId -> Set of socketIds

// Rate Limiter: 10 messages per second per user
const rateLimiter = new RateLimiterMemory({
    points: 10,
    duration: 1,
});

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

            io.adapter(createAdapter(pubClient, subClient));
            console.log("✅ Redis Adapter initialized for Socket.IO");
        } catch (error) {
            console.error("❌ Failed to initialize Redis Adapter:", error);
        }
    } else {
        console.log("⚠️ No REDIS_URL found. Using default in-memory adapter (Single Instance Mode).");
    }

    // Chat namespace with authentication
    const chatNamespace = io.of("/chat");

    // Authentication middleware
    chatNamespace.use(async (socket: Socket, next) => {
        try {
            const token = socket.handshake.auth.token;

            if (!token) {
                return next(new Error("Authentication required"));
            }

            // Verify JWT token using existing utility
            const decoded = verifyAccessToken(token);

            // Fetch user from database
            const user = await User.findById(decoded.userId);

            if (!user || !user.isActive) {
                return next(new Error("User not found or inactive"));
            }

            // Attach user info to socket
            (socket as AuthenticatedSocket).userId = user._id.toString();
            (socket as AuthenticatedSocket).userRole = user.role as
                | "customer"
                | "admin";

            console.log(
                `🔌 Socket authenticated: ${user.name} (${user.role}) - ${socket.id}`
            );
            next();
        } catch (error: any) {
            console.error("Socket auth error:", error.message);
            next(new Error("Invalid or expired token"));
        }
    });

    // Handle connections
    chatNamespace.on("connection", async (socket: Socket) => {
        const authSocket = socket as AuthenticatedSocket;
        const { userId, userRole } = authSocket;

        // Track connection via Rooms (Scalable)
        await socket.join(`user:${userId}`);

        // Track connection via Map (Legacy/Local stats)
        if (!userConnections.has(userId)) {
            userConnections.set(userId, new Set());
        }
        userConnections.get(userId)!.add(socket.id);

        console.log(
            `✅ User connected: ${userId} (${userRole}) - Socket: ${socket.id}`
        );

        // ==================== JOIN CHAT ====================
        socket.on("join-chat", async (data, callback) => {
            try {
                let room;

                if (userRole === "customer") {
                    // Customer: Find or create their open room
                    room = await ChatRoom.findOne({
                        customerId: userId,
                        status: "open",
                    });

                    if (!room) {
                        room = await ChatRoom.create({
                            customerId: userId,
                            status: "open",
                        });
                        console.log(`📝 New chat room created for customer: ${userId}`);
                    }
                } else if (userRole === "admin") {
                    // Admin: Join a specific room or get unassigned rooms
                    if (data?.roomId) {
                        room = await ChatRoom.findById(data.roomId);
                        if (room && !room.adminId) {
                            // Assign admin to this room
                            room.adminId = userId as any;
                            await room.save();
                            console.log(`👤 Admin ${userId} assigned to room: ${room._id}`);
                        }
                    }
                }

                if (!room) {
                    return callback?.({
                        success: false,
                        error: "Unable to join chat room",
                    });
                }

                // Join socket room
                const roomName = `room:${room._id}`;
                socket.join(roomName);
                console.log(`🚪 Socket ${socket.id} joined room: ${roomName}`);

                // Load message history (last 50 messages)
                const messages = await Message.find({ roomId: room._id })
                    .sort({ createdAt: -1 })
                    .limit(50)
                    .lean();

                // Emit chat history (reversed to chronological order)
                socket.emit("chat-history", {
                    roomId: room._id.toString(),
                    messages: messages.reverse(),
                });

                callback?.({
                    success: true,
                    roomId: room._id.toString(),
                });
            } catch (error: any) {
                console.error("join-chat error:", error.message);
                callback?.({ success: false, error: "Failed to join chat" });
            }
        });

        // ==================== SEND MESSAGE ====================
        socket.on("send-message", async (data, callback) => {
            try {
                const { roomId, content } = data;

                // Rate Limiting Check
                try {
                    await rateLimiter.consume(userId); // Consume 1 point by userId
                } catch (rejRes) {
                    return callback?.({ success: false, error: "Rate limit exceeded. Please slow down." });
                }

                // Validate message
                if (!content || typeof content !== "string") {
                    return callback?.({ success: false, error: "Message content required" });
                }

                if (content.length > 2000) {
                    return callback?.({ success: false, error: "Message too long (max 2000 chars)" });
                }

                // Verify room exists and user has access
                const room = await ChatRoom.findById(roomId);
                if (!room) {
                    return callback?.({ success: false, error: "Room not found" });
                }

                // Check access: customer must own room, admin must be assigned or unassigned
                const isCustomerOwner =
                    userRole === "customer" && room.customerId.toString() === userId;
                const isAdminAllowed =
                    userRole === "admin" &&
                    (!room.adminId || room.adminId.toString() === userId);

                if (!isCustomerOwner && !isAdminAllowed) {
                    return callback?.({ success: false, error: "Access denied" });
                }

                // Save message to database
                const message = await Message.create({
                    roomId: room._id,
                    senderId: userId,
                    senderRole: userRole,
                    content: content.trim(),
                });

                // Update room's last message timestamp and unread counts
                room.lastMessageAt = new Date();

                // Increment unread count for the recipient
                if (userRole === "customer") {
                    room.unreadCountAdmin = (room.unreadCountAdmin || 0) + 1;
                } else {
                    room.unreadCountCustomer = (room.unreadCountCustomer || 0) + 1;
                }

                // Auto-assign admin if they respond to unassigned room
                if (userRole === "admin" && !room.adminId) {
                    room.adminId = userId as any;
                }

                await room.save();

                // Prepare message for broadcast
                const messageData = {
                    _id: message._id.toString(),
                    roomId: message.roomId.toString(),
                    senderId: message.senderId.toString(),
                    senderRole: message.senderRole,
                    content: message.content,
                    status: message.status,
                    createdAt: message.createdAt,
                };

                // Broadcast to all users in the room
                const roomName = `room:${roomId}`;
                chatNamespace.to(roomName).emit("new-message", messageData);

                // ACK confirmation to sender
                callback?.({
                    success: true,
                    message: messageData,
                });

                console.log(
                    `💬 Message sent in room ${roomId}: "${content.substring(0, 50)}..."`
                );
            } catch (error: any) {
                console.error("send-message error:", error.message);
                callback?.({ success: false, error: "Failed to send message" });
            }
        });

        // ==================== TYPING INDICATORS ====================
        socket.on("typing", (data) => {
            const { roomId } = data;
            socket.to(`room:${roomId}`).emit("typing", {
                roomId,
                userId,
                userRole
            });
        });

        socket.on("stop-typing", (data) => {
            const { roomId } = data;
            socket.to(`room:${roomId}`).emit("stop-typing", {
                roomId,
                userId
            });
        });

        // ==================== MESSAGE READ ====================
        socket.on("message-read", async (data) => {
            try {
                const { roomId, messageIds } = data; // Expecting array of message IDs

                if (!roomId) return;

                const roomName = `room:${roomId}`;

                // Update messages in DB
                if (messageIds && Array.isArray(messageIds) && messageIds.length > 0) {
                    await Message.updateMany(
                        {
                            _id: { $in: messageIds },
                            roomId: roomId,
                            senderId: { $ne: userId } // Only mark others' messages as read
                        },
                        {
                            $set: {
                                status: "read",
                                readAt: new Date()
                            }
                        }
                    );
                }

                // Reset unread count for this user in the room
                const room = await ChatRoom.findById(roomId);
                if (room) {
                    if (userRole === "customer") {
                        room.unreadCountCustomer = 0;
                    } else {
                        room.unreadCountAdmin = 0;
                    }
                    await room.save();
                }

                // Broadcast read receipt
                socket.to(roomName).emit("message-read", {
                    roomId,
                    userId,
                    userRole,
                    readAt: new Date()
                });

            } catch (error: any) {
                console.error("message-read error:", error.message);
            }
        });

        // ==================== GET ROOMS (Admin only) ====================
        socket.on("get-rooms", async (callback) => {
            try {
                if (userRole !== "admin") {
                    return callback?.({ success: false, error: "Admin only" });
                }

                // Get all open rooms for admin dashboard
                const rooms = await ChatRoom.find({ status: "open" })
                    .populate("customerId", "name email")
                    .populate("adminId", "name")
                    .sort({ lastMessageAt: -1 }) // Sort by most recent activity
                    .lean();

                callback?.({ success: true, rooms });
            } catch (error: any) {
                console.error("get-rooms error:", error.message);
                callback?.({ success: false, error: "Failed to get rooms" });
            }
        });

        // ==================== DISCONNECT ====================
        socket.on("disconnect", (reason) => {
            // Remove from connection tracking
            const userSockets = userConnections.get(userId);
            if (userSockets) {
                userSockets.delete(socket.id);
                if (userSockets.size === 0) {
                    userConnections.delete(userId);
                }
            }

            console.log(
                `❌ User disconnected: ${userId} - Socket: ${socket.id} - Reason: ${reason}`
            );
        });
    });

    console.log("🔌 Socket.IO initialized with /chat namespace");

    return io;
};

/**
 * Check if a user is currently connected
 */
export const isUserOnline = (userId: string): boolean => {
    return userConnections.has(userId) && userConnections.get(userId)!.size > 0;
};

/**
 * Get all socket IDs for a user
 */
export const getUserSockets = (userId: string): string[] => {
    return Array.from(userConnections.get(userId) || []);
};
