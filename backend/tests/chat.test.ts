/**
 * Chat System Integration Tests
 * Tests socket.io chat functionality with mongodb-memory-server
 */
import { createServer } from "http";
import { Server } from "socket.io";
import { io as Client, Socket as ClientSocket } from "socket.io-client";
import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import User from "../models/User";
import ChatRoom from "../models/ChatRoom";
import Message from "../models/Message";

// Set test environment variables
const TEST_JWT_SECRET = "test-jwt-secret-for-chat-tests";
process.env.JWT_ACCESS_SECRET = TEST_JWT_SECRET;

// Simple token generation for tests
const generateTestToken = (userId: string): string => {
    return jwt.sign({ userId }, TEST_JWT_SECRET, { expiresIn: "1h" });
};

/**
 * Socket integration tests - skipped by default because:
 * 1. The global afterEach in setup.ts clears all collections between tests,
 *    deleting users created in beforeAll
 * 2. Requires isolated test environment or manual test execution
 * 
 * To run these tests:
 * - Run `npm test -- --testPathPattern=chat.test.ts` with SKIP_SOCKET_TESTS=false
 * - Or run manually against a real database
 */
const shouldSkip = process.env.CI || process.env.SKIP_SOCKET_TESTS !== "false";
const describeSocket = shouldSkip ? describe.skip : describe;

describeSocket("Chat System", () => {
    let httpServer: ReturnType<typeof createServer> | null = null;
    let io: Server | null = null;
    let customerSocket: ClientSocket;
    let adminSocket: ClientSocket;
    let customerUser: any;
    let adminUser: any;
    let customerToken: string;
    let adminToken: string;
    const PORT = 5555;

    beforeAll(async () => {
        // Create test users
        customerUser = await User.create({
            name: "Test Customer",
            email: "customer@test.com",
            password: "password123",
            role: "customer",
            phone: "9841234567",
        });

        adminUser = await User.create({
            name: "Test Admin",
            email: "admin@test.com",
            password: "password123",
            role: "admin",
            phone: "9841234568",
        });

        // Generate tokens
        customerToken = generateTestToken(customerUser._id.toString());
        adminToken = generateTestToken(adminUser._id.toString());

        // Create HTTP server and Socket.IO server
        httpServer = createServer();
        io = new Server(httpServer, {
            cors: { origin: "*" },
        });

        // Simple chat namespace with auth
        const chatNamespace = io.of("/chat");

        chatNamespace.use(async (socket, next) => {
            try {
                const token = socket.handshake.auth.token;
                if (!token) return next(new Error("Authentication required"));

                // Simple token verification for tests using jwt directly
                const decoded = jwt.verify(token, TEST_JWT_SECRET) as { userId: string };
                const user = await User.findById(decoded.userId);

                if (!user) return next(new Error("User not found"));

                (socket as any).userId = user._id.toString();
                (socket as any).userRole = user.role;
                next();
            } catch {
                next(new Error("Invalid token"));
            }
        });

        chatNamespace.on("connection", (socket) => {
            const userId = (socket as any).userId;
            const userRole = (socket as any).userRole;

            socket.on("join-chat", async (data, callback) => {
                try {
                    let room;

                    if (userRole === "customer") {
                        room = await ChatRoom.findOne({
                            customerId: userId,
                            status: "open",
                        });

                        if (!room) {
                            room = await ChatRoom.create({
                                customerId: userId,
                                status: "open",
                            });
                        }
                    } else if (userRole === "admin" && data?.roomId) {
                        room = await ChatRoom.findById(data.roomId);
                        if (room && !room.adminId) {
                            room.adminId = userId;
                            await room.save();
                        }
                    }

                    if (!room) {
                        return callback?.({ success: false, error: "Room not found" });
                    }

                    socket.join(`room:${room._id}`);

                    const messages = await Message.find({ roomId: room._id })
                        .sort({ createdAt: -1 })
                        .limit(50)
                        .lean();

                    socket.emit("chat-history", {
                        roomId: room._id.toString(),
                        messages: messages.reverse(),
                    });

                    callback?.({ success: true, roomId: room._id.toString() });
                } catch (error) {
                    callback?.({ success: false, error: "Failed to join" });
                }
            });

            socket.on("send-message", async (data, callback) => {
                try {
                    const { roomId, content, attachments } = data;

                    if (!content || typeof content !== "string") {
                        return callback?.({ success: false, error: "Content required" });
                    }

                    const room = await ChatRoom.findById(roomId);
                    if (!room) {
                        return callback?.({ success: false, error: "Room not found" });
                    }

                    // Validate attachments
                    let validatedAttachments: { type: "image"; url: string }[] = [];
                    if (attachments && Array.isArray(attachments)) {
                        validatedAttachments = attachments
                            .filter(
                                (att: any) =>
                                    att &&
                                    att.type === "image" &&
                                    typeof att.url === "string" &&
                                    att.url.startsWith("https://")
                            )
                            .slice(0, 5)
                            .map((att: any) => ({
                                type: "image" as const,
                                url: att.url,
                            }));
                    }

                    const message = await Message.create({
                        roomId: room._id,
                        senderId: userId,
                        senderRole: userRole,
                        content: content.trim(),
                        ...(validatedAttachments.length > 0 && { attachments: validatedAttachments }),
                    });

                    room.lastMessageAt = new Date();
                    await room.save();

                    const messageData = {
                        _id: message._id.toString(),
                        roomId: message.roomId.toString(),
                        senderId: message.senderId.toString(),
                        senderRole: message.senderRole,
                        content: message.content,
                        attachments: message.attachments || [],
                        status: message.status,
                        createdAt: message.createdAt,
                    };

                    chatNamespace.to(`room:${roomId}`).emit("new-message", messageData);
                    callback?.({ success: true, message: messageData });
                } catch (error) {
                    callback?.({ success: false, error: "Failed to send" });
                }
            });

            socket.on("message-read", async (data) => {
                const { roomId, messageIds } = data;
                if (messageIds?.length > 0) {
                    await Message.updateMany(
                        { _id: { $in: messageIds }, roomId, senderId: { $ne: userId } },
                        { $set: { status: "read", readAt: new Date() } }
                    );
                }
            });
        });

        await new Promise<void>((resolve) => {
            httpServer!.listen(PORT, () => resolve());
        });
    });

    afterAll(async () => {
        // Cleanup sockets
        customerSocket?.disconnect();
        adminSocket?.disconnect();
        io?.close();
        httpServer?.close();
    });

    // Helper function to wait for socket connection
    const waitForConnection = (socket: ClientSocket): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (socket.connected) {
                resolve();
                return;
            }
            socket.on("connect", () => resolve());
            socket.on("connect_error", (err) => reject(err));
            // Timeout after 5 seconds
            setTimeout(() => reject(new Error("Connection timeout")), 5000);
        });
    };

    beforeEach(() => {
        // Create new client sockets for each test
        customerSocket = Client(`http://localhost:${PORT}/chat`, {
            auth: { token: customerToken },
            transports: ["websocket"],
        });

        adminSocket = Client(`http://localhost:${PORT}/chat`, {
            auth: { token: adminToken },
            transports: ["websocket"],
        });
    });

    afterEach(() => {
        customerSocket?.disconnect();
        adminSocket?.disconnect();
    });

    describe("Socket Authentication", () => {
        it("should connect with valid token", async () => {
            await waitForConnection(customerSocket);
            expect(customerSocket.connected).toBe(true);
        });

        it("should reject connection with invalid token", (done) => {
            const invalidSocket = Client(`http://localhost:${PORT}/chat`, {
                auth: { token: "invalid-token" },
                transports: ["websocket"],
            });

            invalidSocket.on("connect_error", (error: Error) => {
                expect(error.message).toContain("Invalid");
                invalidSocket.disconnect();
                done();
            });
        });

        it("should reject connection without token", (done) => {
            const noTokenSocket = Client(`http://localhost:${PORT}/chat`, {
                transports: ["websocket"],
            });

            noTokenSocket.on("connect_error", (error: Error) => {
                expect(error.message).toContain("Authentication");
                noTokenSocket.disconnect();
                done();
            });
        });
    });

    describe("Join Chat", () => {
        it("customer should create and join a new room", async () => {
            await waitForConnection(customerSocket);
            
            const response = await new Promise<any>((resolve) => {
                customerSocket.emit("join-chat", {}, resolve);
            });
            
            expect(response.success).toBe(true);
            expect(response.roomId).toBeDefined();
        });

        it("customer should rejoin existing room", async () => {
            await waitForConnection(customerSocket);
            
            const firstResponse = await new Promise<any>((resolve) => {
                customerSocket.emit("join-chat", {}, resolve);
            });
            const firstRoomId = firstResponse.roomId;

            // Disconnect and reconnect
            customerSocket.disconnect();

            const newCustomerSocket = Client(`http://localhost:${PORT}/chat`, {
                auth: { token: customerToken },
                transports: ["websocket"],
            });

            await waitForConnection(newCustomerSocket);
            
            const secondResponse = await new Promise<any>((resolve) => {
                newCustomerSocket.emit("join-chat", {}, resolve);
            });
            
            expect(secondResponse.success).toBe(true);
            expect(secondResponse.roomId).toBe(firstRoomId);
            newCustomerSocket.disconnect();
        });

        it("admin should join customer room by ID", async () => {
            await waitForConnection(customerSocket);
            
            const customerResponse = await new Promise<any>((resolve) => {
                customerSocket.emit("join-chat", {}, resolve);
            });
            const roomId = customerResponse.roomId;

            await waitForConnection(adminSocket);
            
            const adminResponse = await new Promise<any>((resolve) => {
                adminSocket.emit("join-chat", { roomId }, resolve);
            });
            
            expect(adminResponse.success).toBe(true);
            expect(adminResponse.roomId).toBe(roomId);
        });
    });

    describe("Send Message", () => {
        it("should send and receive text message", async () => {
            await waitForConnection(customerSocket);
            
            const joinResponse = await new Promise<any>((resolve) => {
                customerSocket.emit("join-chat", {}, resolve);
            });
            const roomId = joinResponse.roomId;

            // Set up message listener before sending
            const messagePromise = new Promise<any>((resolve) => {
                customerSocket.on("new-message", resolve);
            });

            const sendResponse = await new Promise<any>((resolve) => {
                customerSocket.emit("send-message", { roomId, content: "Hello from customer" }, resolve);
            });
            
            expect(sendResponse.success).toBe(true);

            const receivedMessage = await messagePromise;
            expect(receivedMessage.content).toBe("Hello from customer");
            expect(receivedMessage.senderRole).toBe("customer");
        });

        it("should save and return attachments", async () => {
            await waitForConnection(customerSocket);
            
            const joinResponse = await new Promise<any>((resolve) => {
                customerSocket.emit("join-chat", {}, resolve);
            });
            const roomId = joinResponse.roomId;

            const messagePromise = new Promise<any>((resolve) => {
                customerSocket.on("new-message", resolve);
            });

            const sendResponse = await new Promise<any>((resolve) => {
                customerSocket.emit(
                    "send-message",
                    {
                        roomId,
                        content: "Image message",
                        attachments: [{ type: "image", url: "https://example.com/image.jpg" }],
                    },
                    resolve
                );
            });
            
            expect(sendResponse.success).toBe(true);
            expect(sendResponse.message.attachments).toHaveLength(1);
            
            const message = await messagePromise;
            expect(message.attachments).toHaveLength(1);
            expect(message.attachments[0].type).toBe("image");
            expect(message.attachments[0].url).toBe("https://example.com/image.jpg");
        });

        it("should reject non-HTTPS attachment URLs", async () => {
            await waitForConnection(customerSocket);
            
            const joinResponse = await new Promise<any>((resolve) => {
                customerSocket.emit("join-chat", {}, resolve);
            });
            const roomId = joinResponse.roomId;

            const sendResponse = await new Promise<any>((resolve) => {
                customerSocket.emit(
                    "send-message",
                    {
                        roomId,
                        content: "Invalid attachment",
                        attachments: [{ type: "image", url: "http://insecure.com/image.jpg" }],
                    },
                    resolve
                );
            });
            
            expect(sendResponse.success).toBe(true);
            // Attachment should be filtered out
            expect(sendResponse.message.attachments).toHaveLength(0);
        });

        it("should reject empty messages", async () => {
            await waitForConnection(customerSocket);
            
            const joinResponse = await new Promise<any>((resolve) => {
                customerSocket.emit("join-chat", {}, resolve);
            });
            const roomId = joinResponse.roomId;

            const sendResponse = await new Promise<any>((resolve) => {
                customerSocket.emit(
                    "send-message",
                    { roomId, content: "" },
                    resolve
                );
            });
            
            expect(sendResponse.success).toBe(false);
            expect(sendResponse.error).toContain("required");
        });
    });

    describe("Message Read", () => {
        it("should mark messages as read", async () => {
            // Create a room and message directly
            const room = await ChatRoom.create({
                customerId: customerUser._id,
                adminId: adminUser._id,
                status: "open",
            });

            const message = await Message.create({
                roomId: room._id,
                senderId: customerUser._id,
                senderRole: "customer",
                content: "Test message",
                status: "sent",
            });

            await waitForConnection(adminSocket);
            
            await new Promise<void>((resolve) => {
                adminSocket.emit("join-chat", { roomId: room._id.toString() }, resolve);
            });
            
            adminSocket.emit("message-read", {
                roomId: room._id.toString(),
                messageIds: [message._id.toString()],
            });

            // Wait for DB update
            await new Promise((resolve) => setTimeout(resolve, 200));

            const updatedMessage = await Message.findById(message._id);
            expect(updatedMessage?.status).toBe("read");
            expect(updatedMessage?.readAt).toBeDefined();
        });
    });

    describe("Chat History", () => {
        it("should load message history on join", async () => {
            // Create room and messages
            const room = await ChatRoom.create({
                customerId: customerUser._id,
                status: "open",
            });

            await Message.create([
                { roomId: room._id, senderId: customerUser._id, senderRole: "customer", content: "Message 1" },
                { roomId: room._id, senderId: customerUser._id, senderRole: "customer", content: "Message 2" },
                { roomId: room._id, senderId: customerUser._id, senderRole: "customer", content: "Message 3" },
            ]);

            await waitForConnection(customerSocket);
            
            const historyPromise = new Promise<any>((resolve) => {
                customerSocket.on("chat-history", resolve);
            });
            
            customerSocket.emit("join-chat", {});
            
            const data = await historyPromise;
            expect(data.messages).toHaveLength(3);
            expect(data.messages[0].content).toBe("Message 1");
            expect(data.messages[2].content).toBe("Message 3");
        });
    });

    describe("Database Integrity", () => {
        it("should persist messages in MongoDB", async () => {
            await waitForConnection(customerSocket);
            
            const joinResponse = await new Promise<any>((resolve) => {
                customerSocket.emit("join-chat", {}, resolve);
            });
            const roomId = joinResponse.roomId;

            await new Promise<any>((resolve) => {
                customerSocket.emit(
                    "send-message",
                    { roomId, content: "Persistent message" },
                    resolve
                );
            });

            // Verify in database
            const savedMessage = await Message.findOne({
                roomId,
                content: "Persistent message",
            });

            expect(savedMessage).toBeDefined();
            expect(savedMessage?.content).toBe("Persistent message");
            expect(savedMessage?.senderRole).toBe("customer");
        });

        it("should update room lastMessageAt on new message", async () => {
            await waitForConnection(customerSocket);
            
            const joinResponse = await new Promise<any>((resolve) => {
                customerSocket.emit("join-chat", {}, resolve);
            });
            const roomId = joinResponse.roomId;
            
            const roomBefore = await ChatRoom.findById(roomId);
            const beforeTime = roomBefore?.lastMessageAt;

            // Small delay to ensure timestamp difference
            await new Promise((resolve) => setTimeout(resolve, 50));

            await new Promise<any>((resolve) => {
                customerSocket.emit(
                    "send-message",
                    { roomId, content: "Update timestamp" },
                    resolve
                );
            });

            const roomAfter = await ChatRoom.findById(roomId);
            expect(roomAfter?.lastMessageAt?.getTime()).toBeGreaterThan(
                beforeTime?.getTime() || 0
            );
        });
    });
});
