/**
 * Chat System Integration Tests
 * Runs the real Socket.IO server from config/socket.ts against mongodb-memory-server.
 */
import { createServer, Server as HttpServer } from "http";
import { AddressInfo } from "net";
import { Server } from "socket.io";
import { io as Client, Socket as ClientSocket } from "socket.io-client";
import request from "supertest";
import app from "../app";
import { initializeSocket } from "../config/socket";
import { disconnectUserSockets } from "../config/socketRegistry";
import ChatRoom from "../models/ChatRoom";
import Message from "../models/Message";
import Notification from "../models/Notification";
import User from "../models/User";
import { createUser } from "./helpers";

jest.mock("../services/pushNotificationService", () => ({
  sendPushNotification: jest.fn().mockResolvedValue([]),
}));

let httpServer: HttpServer;
let io: Server;
let url: string;
const sockets: ClientSocket[] = [];

const IMAGE_URL = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload/v1/chat/photo.jpg`;

const connect = (token?: string): Promise<ClientSocket> =>
  new Promise((resolve, reject) => {
    const socket = Client(`${url}/chat`, {
      auth: token ? { token } : {},
      transports: ["websocket"],
      reconnection: false,
      forceNew: true,
    });
    sockets.push(socket);
    socket.on("connect", () => resolve(socket));
    socket.on("connect_error", reject);
  });

const emitAck = <T = any>(socket: ClientSocket, event: string, data?: unknown): Promise<T> =>
  new Promise((resolve) => socket.emit(event, data, resolve));

const nextEvent = <T = any>(socket: ClientSocket, event: string, ms = 2000): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout waiting for ${event}`)), ms);
    socket.once(event, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });

const noEvent = (socket: ClientSocket, event: string, ms = 300): Promise<boolean> =>
  new Promise((resolve) => {
    const handler = () => resolve(false);
    socket.once(event, handler);
    setTimeout(() => {
      socket.off(event, handler);
      resolve(true);
    }, ms);
  });

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

beforeAll(async () => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  await ChatRoom.init(); // build the "one open room per customer" index
  httpServer = createServer();
  io = initializeSocket(httpServer);
  await new Promise<void>((resolve) => httpServer.listen(0, () => resolve()));
  url = `http://localhost:${(httpServer.address() as AddressInfo).port}`;
});

afterEach(() => {
  sockets.splice(0).forEach((s) => s.disconnect());
});

afterAll(async () => {
  io.close();
  await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

/** A customer with an open room, an admin, and both connected */
const setup = async () => {
  const customer = await createUser({ name: "Asha" });
  const admin = await createUser({ role: "admin", name: "Support Sita" });
  const customerSocket = await connect(customer.accessToken);
  const adminSocket = await connect(admin.accessToken);
  const joined = await emitAck(customerSocket, "join-chat", {});
  return { customer, admin, customerSocket, adminSocket, roomId: joined.roomId as string };
};

describe("Chat authentication", () => {
  it("accepts a valid access token", async () => {
    const { accessToken } = await createUser();
    const socket = await connect(accessToken);
    expect(socket.connected).toBe(true);
  });

  it("rejects connections without a token or with an invalid one", async () => {
    await expect(connect()).rejects.toThrow(/Authentication required/);
    await expect(connect("not-a-token")).rejects.toThrow(/Invalid or expired token/);
  });
});

describe("Conversations", () => {
  it("creates one room per customer and reuses it on rejoin", async () => {
    const { customerSocket, roomId } = await setup();
    const again = await emitAck(customerSocket, "join-chat", {});
    expect(again.roomId).toBe(roomId);
    expect(await ChatRoom.countDocuments()).toBe(1);
  });

  it("creates a single room when two tabs join at the same time", async () => {
    const customer = await createUser();
    const [tab1, tab2] = await Promise.all([connect(customer.accessToken), connect(customer.accessToken)]);
    const [a, b] = await Promise.all([emitAck(tab1, "join-chat", {}), emitAck(tab2, "join-chat", {})]);
    expect(a.roomId).toBe(b.roomId);
    expect(await ChatRoom.countDocuments({ customerId: customer.user._id })).toBe(1);
  });

  it("delivers messages and keeps text exactly as typed", async () => {
    const { adminSocket, customerSocket, roomId } = await setup();
    await emitAck(adminSocket, "join-chat", { roomId });

    const received = nextEvent(adminSocket, "new-message");
    const ack = await emitAck(customerSocket, "send-message", { roomId, content: "I <3 this romper & size 2-3?" });

    expect(ack.success).toBe(true);
    expect((await received).content).toBe("I <3 this romper & size 2-3?");
    const stored = await Message.findOne({ roomId });
    expect(stored!.content).toBe("I <3 this romper & size 2-3?");
  });

  it("lets any admin reply and records the most recent responder", async () => {
    const { customerSocket, adminSocket, roomId } = await setup();
    const secondAdmin = await createUser({ role: "admin" });
    const secondSocket = await connect(secondAdmin.accessToken);

    await emitAck(adminSocket, "join-chat", { roomId });
    expect((await emitAck(adminSocket, "send-message", { roomId, content: "Hi from admin 1" })).success).toBe(true);

    await emitAck(secondSocket, "join-chat", { roomId });
    const reply = await emitAck(secondSocket, "send-message", { roomId, content: "Hi from admin 2" });
    expect(reply.success).toBe(true);

    const room = await ChatRoom.findById(roomId);
    expect(String(room!.adminId)).toBe(String(secondAdmin.user._id));
    void customerSocket;
  });

  it("does not show an admin messages from the previous conversation after switching", async () => {
    const { customerSocket: customerA, adminSocket, roomId: roomA } = await setup();
    const customerB = await createUser();
    const socketB = await connect(customerB.accessToken);
    const { roomId: roomB } = await emitAck(socketB, "join-chat", {});

    await emitAck(adminSocket, "join-chat", { roomId: roomA });
    await emitAck(adminSocket, "join-chat", { roomId: roomB }); // switch conversations

    const quiet = noEvent(adminSocket, "new-message", 400);
    await emitAck(customerA, "send-message", { roomId: roomA, content: "Customer A again" });
    expect(await quiet).toBe(true);

    const fromB = nextEvent(adminSocket, "new-message");
    await emitAck(socketB, "send-message", { roomId: roomB, content: "Customer B" });
    expect((await fromB).roomId).toBe(roomB);
  });

  it("does not let a customer post to another customer's room", async () => {
    const { roomId } = await setup();
    const intruder = await createUser();
    const intruderSocket = await connect(intruder.accessToken);

    const res = await emitAck(intruderSocket, "send-message", { roomId, content: "hi" });
    expect(res.success).toBe(false);
    expect(await Message.countDocuments({ roomId })).toBe(0);
  });
});

describe("Messages", () => {
  it("sends image-only messages without placeholder text", async () => {
    const { customerSocket, roomId } = await setup();
    const res = await emitAck(customerSocket, "send-message", {
      roomId,
      attachments: [{ type: "image", url: IMAGE_URL }],
    });
    expect(res.success).toBe(true);
    expect(res.message.content).toBe("");
    expect(res.message.attachments).toEqual([{ type: "image", url: IMAGE_URL }]);
    expect((await ChatRoom.findById(roomId))!.lastMessagePreview).toBe("📷 Photo");
  });

  it("only accepts images uploaded to the shop's Cloudinary account", async () => {
    const { customerSocket, roomId } = await setup();
    const res = await emitAck(customerSocket, "send-message", {
      roomId,
      content: "look",
      attachments: [{ type: "image", url: "https://tracker.example.com/pixel.gif" }],
    });
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/uploaded through the chat/);
  });

  it("rejects empty and over-long messages with a readable error", async () => {
    const { customerSocket, roomId } = await setup();
    expect((await emitAck(customerSocket, "send-message", { roomId, content: "   " })).error).toMatch(/empty/);
    expect((await emitAck(customerSocket, "send-message", { roomId, content: "x".repeat(2001) })).error).toMatch(/2000/);
  });

  it("returns history in pages", async () => {
    const { customerSocket, roomId } = await setup();
    const base = Date.now() - 60 * 60 * 1000;
    await Message.insertMany(
      Array.from({ length: 60 }, (_, i) => ({
        roomId,
        senderId: new (require("mongoose").Types.ObjectId)(),
        senderRole: "customer",
        content: `m${i}`,
        createdAt: new Date(base + i * 1000),
      })),
    );

    const history = nextEvent(customerSocket, "chat-history");
    const joined = await emitAck(customerSocket, "join-chat", {});
    const first = await history;
    expect(joined.hasMore).toBe(true);
    expect(first.messages).toHaveLength(50);
    expect(first.messages[0].content).toBe("m10");

    const older = await emitAck(customerSocket, "load-messages", { roomId, before: first.messages[0].createdAt });
    expect(older.success).toBe(true);
    expect(older.hasMore).toBe(false);
    expect(older.messages.map((m: any) => m.content)).toEqual(Array.from({ length: 10 }, (_, i) => `m${i}`));
  });
});

describe("Unread counts and read receipts", () => {
  it("keeps badge counts up to date for customer and admins", async () => {
    const { customerSocket, adminSocket, roomId } = await setup();

    const adminBadge = nextEvent(adminSocket, "unread-updated");
    await emitAck(customerSocket, "send-message", { roomId, content: "Hello?" });
    expect((await adminBadge).count).toBe(1);
    expect((await emitAck(adminSocket, "get-unread")).count).toBe(1);

    // The admin replies without being in the room view yet → customer badge
    await emitAck(adminSocket, "join-chat", { roomId });
    const customerBadge = nextEvent(customerSocket, "unread-updated");
    await emitAck(adminSocket, "send-message", { roomId, content: "Hi Asha" });
    expect((await customerBadge).count).toBe(1);
  });

  it("marks the other side's messages read and sends a receipt", async () => {
    const { customerSocket, adminSocket, roomId } = await setup();
    await emitAck(customerSocket, "send-message", { roomId, content: "one" });
    await emitAck(customerSocket, "send-message", { roomId, content: "two" });
    await emitAck(adminSocket, "join-chat", { roomId });

    const receipt = nextEvent(customerSocket, "message-read");
    const badge = nextEvent(adminSocket, "unread-updated");
    adminSocket.emit("message-read", { roomId });

    expect((await receipt).readerRole).toBe("admin");
    expect((await badge).count).toBe(0);
    expect(await Message.countDocuments({ roomId, status: "read" })).toBe(2);
  });

  it("ignores typing and read events for rooms the socket has not joined", async () => {
    const { customerSocket, adminSocket, roomId } = await setup();
    await emitAck(adminSocket, "join-chat", { roomId });
    await emitAck(customerSocket, "send-message", { roomId, content: "unread" });

    const intruder = await createUser();
    const intruderSocket = await connect(intruder.accessToken);

    const quiet = noEvent(customerSocket, "typing");
    intruderSocket.emit("typing", { roomId });
    expect(await quiet).toBe(true);

    intruderSocket.emit("message-read", { roomId });
    await wait(200);
    expect((await ChatRoom.findById(roomId))!.unreadCountAdmin).toBe(1);
  });
});

describe("Closing conversations", () => {
  it("lets an admin close a conversation; the customer then starts a new one", async () => {
    const { customerSocket, adminSocket, roomId } = await setup();
    await emitAck(adminSocket, "join-chat", { roomId });

    const closed = nextEvent(customerSocket, "room-closed");
    expect((await emitAck(adminSocket, "close-room", { roomId })).success).toBe(true);
    expect((await closed).roomId).toBe(roomId);

    const blocked = await emitAck(customerSocket, "send-message", { roomId, content: "still there?" });
    expect(blocked.code).toBe("ROOM_CLOSED");

    const rejoined = await emitAck(customerSocket, "join-chat", {});
    expect(rejoined.roomId).not.toBe(roomId);

    const open = await emitAck(adminSocket, "get-rooms", { status: "open" });
    const closedList = await emitAck(adminSocket, "get-rooms", { status: "closed" });
    expect(open.rooms.map((r: any) => String(r._id))).toEqual([rejoined.roomId]);
    expect(closedList.rooms.map((r: any) => String(r._id))).toEqual([roomId]);
  });

  it("only admins can close conversations", async () => {
    const { customerSocket, roomId } = await setup();
    expect((await emitAck(customerSocket, "close-room", { roomId })).success).toBe(false);
  });
});

describe("Notifications", () => {
  it("gives an offline customer one bell entry per conversation, not one per message", async () => {
    const { customer, customerSocket, adminSocket, roomId } = await setup();
    customerSocket.disconnect();
    await wait(100);

    await emitAck(adminSocket, "join-chat", { roomId });
    await emitAck(adminSocket, "send-message", { roomId, content: "Your order shipped" });
    await emitAck(adminSocket, "send-message", { roomId, content: "Tracking: NP123" });
    await wait(100);

    const notes = await Notification.find({ userId: customer.user._id, type: "chat_message" });
    expect(notes).toHaveLength(1);
    expect(notes[0].body).toBe("Tracking: NP123");
    expect((notes[0].data as any).roomId).toBe(roomId);
  });

  it("does not add bell entries for a customer who is connected", async () => {
    const { customer, adminSocket, roomId } = await setup();
    await emitAck(adminSocket, "join-chat", { roomId });
    await emitAck(adminSocket, "send-message", { roomId, content: "Hi" });
    await wait(100);
    expect(await Notification.countDocuments({ userId: customer.user._id })).toBe(0);
  });
});

describe("Account changes", () => {
  it("stops a deactivated user from sending and disconnects them", async () => {
    const { customer, customerSocket, roomId } = await setup();
    await User.updateOne({ _id: customer.user._id }, { isActive: false });

    const disconnected = nextEvent(customerSocket, "disconnect");
    const res = await emitAck(customerSocket, "send-message", { roomId, content: "hi" });
    expect(res.success).toBe(false);
    await disconnected;
  });

  it("disconnects all of a user's sockets on request (deactivation, revoked sessions)", async () => {
    const { customer, customerSocket } = await setup();
    const disconnected = nextEvent(customerSocket, "disconnect");
    disconnectUserSockets(String(customer.user._id));
    expect(await disconnected).toBe("io server disconnect");
  });
});

describe("Chat image upload", () => {
  it("returns 400 (not a server error) when no image is sent", async () => {
    const { accessToken } = await createUser();
    const res = await request(app)
      .post("/api/v1/chat/upload")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/No image/);
  });
});
