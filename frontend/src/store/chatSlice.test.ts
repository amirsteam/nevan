import { describe, it, expect } from "vitest";
import reducer, {
    enterRoom,
    setMessages,
    addMessage,
    prependMessages,
    markMessagesRead,
    roomClosed,
    leaveRoom,
    openChat,
    ChatMessage,
} from "./chatSlice";

const msg = (id: string, roomId: string, senderRole: "customer" | "admin" = "customer"): ChatMessage => ({
    _id: id,
    roomId,
    senderId: senderRole === "customer" ? "c1" : "a1",
    senderRole,
    content: id,
    status: "sent",
    createdAt: new Date(2026, 0, 1, 10, Number(id.replace(/\D/g, "")) || 0).toISOString(),
});

const inRoom = (roomId = "A") => reducer(undefined, enterRoom({ roomId, status: "open", hasMore: true }));

describe("chat store", () => {
    it("only shows live messages from the open conversation", () => {
        let state = inRoom("B");
        state = reducer(state, addMessage(msg("m1", "A"))); // another customer's room
        state = reducer(state, addMessage(msg("m2", "B")));
        state = reducer(state, addMessage(msg("m2", "B"))); // duplicate delivery
        expect(state.messages.map((m) => m._id)).toEqual(["m2"]);
    });

    it("ignores history that arrives for a room the user already left", () => {
        let state = inRoom("A");
        state = reducer(state, enterRoom({ roomId: "B", status: "open" }));
        state = reducer(state, setMessages({ roomId: "A", messages: [msg("m1", "A")] }));
        expect(state.messages).toEqual([]);
    });

    it("prepends older messages without duplicates", () => {
        let state = inRoom("A");
        state = reducer(state, setMessages({ roomId: "A", messages: [msg("m3", "A"), msg("m4", "A")], hasMore: true }));
        state = reducer(state, prependMessages({ roomId: "A", messages: [msg("m1", "A"), msg("m2", "A"), msg("m3", "A")], hasMore: false }));
        expect(state.messages.map((m) => m._id)).toEqual(["m1", "m2", "m3", "m4"]);
        expect(state.hasMore).toBe(false);
    });

    it("ticks the sender's messages as read when the other side reads them", () => {
        let state = inRoom("A");
        state = reducer(state, setMessages({ roomId: "A", messages: [msg("m1", "A", "customer"), msg("m2", "A", "admin")] }));
        state = reducer(state, markMessagesRead({ roomId: "A", readerRole: "admin" }));
        expect(state.messages.map((m) => m.status)).toEqual(["read", "sent"]);
    });

    it("marks the open conversation closed", () => {
        let state = inRoom("A");
        state = reducer(state, roomClosed("A"));
        expect(state.roomStatus).toBe("closed");
    });

    it("clears messages when leaving a conversation and remembers a room to open", () => {
        let state = inRoom("A");
        state = reducer(state, setMessages({ roomId: "A", messages: [msg("m1", "A")] }));
        state = reducer(state, leaveRoom());
        expect(state.messages).toEqual([]);
        expect(state.activeRoomId).toBeNull();

        state = reducer(state, openChat({ roomId: "Z" }));
        expect(state.isOpen).toBe(true);
        expect(state.pendingRoomId).toBe("Z");
    });
});
