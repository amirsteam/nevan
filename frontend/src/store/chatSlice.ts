/**
 * Chat Redux Slice
 * Real-time support chat state. The socket connection and its listeners live in
 * hooks/useChatConnection.ts (mounted for every signed-in user), so unread counts
 * keep updating while the chat window is closed.
 */
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ChatMessage {
    _id: string;
    roomId: string;
    senderId: string;
    senderRole: "customer" | "admin";
    content: string;
    attachments?: { type: "image"; url: string }[];
    status: "sent" | "delivered" | "read";
    createdAt: string;
}

/** Admin inbox entry (GET via socket "get-rooms") */
export interface ChatRoomSummary {
    _id: string;
    // null for website visitors (guests)
    customerId: { _id: string; name: string; email: string } | null;
    guestName?: string;
    guestEmail?: string;
    adminId?: { _id: string; name: string } | null;
    status: "open" | "closed";
    lastMessageAt?: string;
    lastMessagePreview?: string;
    unreadCountCustomer: number;
    unreadCountAdmin: number;
}

interface ChatState {
    isOpen: boolean;
    activeRoomId: string | null;
    roomStatus: "open" | "closed" | null;
    messages: ChatMessage[];
    hasMore: boolean;
    loadingOlder: boolean;
    rooms: ChatRoomSummary[];
    roomFilter: "open" | "closed";
    // Room to open once the window is ready (e.g. from a notification)
    pendingRoomId: string | null;
    connectionStatus: "disconnected" | "connecting" | "connected" | "error";
    isLoading: boolean;
    error: string | null;
    unreadCount: number;
    typing: { roomId: string; role: "customer" | "admin" } | null;
    // Signed-out visitor chatting as a guest (token kept in utils/guestChat)
    guest: { id: string; name: string } | null;
}

const initialState: ChatState = {
    isOpen: false,
    activeRoomId: null,
    roomStatus: null,
    messages: [],
    hasMore: false,
    loadingOlder: false,
    rooms: [],
    roomFilter: "open",
    pendingRoomId: null,
    connectionStatus: "disconnected",
    isLoading: false,
    error: null,
    unreadCount: 0,
    typing: null,
    guest: null,
};

const chatSlice = createSlice({
    name: "chat",
    initialState,
    reducers: {
        toggleChat: (state) => {
            state.isOpen = !state.isOpen;
        },

        setIsOpen: (state, action: PayloadAction<boolean>) => {
            state.isOpen = action.payload;
        },

        /** Open the chat window, optionally straight into a conversation (admins) */
        openChat: (state, action: PayloadAction<{ roomId?: string } | undefined>) => {
            state.isOpen = true;
            state.pendingRoomId = action.payload?.roomId ?? null;
        },

        clearPendingRoom: (state) => {
            state.pendingRoomId = null;
        },

        /** A conversation was joined; history arrives separately via setMessages */
        enterRoom: (
            state,
            action: PayloadAction<{ roomId: string; status: "open" | "closed"; hasMore?: boolean }>,
        ) => {
            if (state.activeRoomId !== action.payload.roomId) {
                state.messages = [];
            }
            state.activeRoomId = action.payload.roomId;
            state.roomStatus = action.payload.status;
            state.hasMore = Boolean(action.payload.hasMore);
            state.typing = null;
        },

        leaveRoom: (state) => {
            state.activeRoomId = null;
            state.roomStatus = null;
            state.messages = [];
            state.hasMore = false;
            state.typing = null;
        },

        setActiveRoomId: (state, action: PayloadAction<string | null>) => {
            state.activeRoomId = action.payload;
        },

        /** Initial history for a room (ignored if the user has moved to another room) */
        setMessages: (
            state,
            action: PayloadAction<{ roomId: string; messages: ChatMessage[]; hasMore?: boolean }>,
        ) => {
            if (action.payload.roomId !== state.activeRoomId) return;
            state.messages = action.payload.messages;
            state.hasMore = Boolean(action.payload.hasMore);
        },

        /** Older history loaded with "Load earlier messages" */
        prependMessages: (
            state,
            action: PayloadAction<{ roomId: string; messages: ChatMessage[]; hasMore: boolean }>,
        ) => {
            if (action.payload.roomId !== state.activeRoomId) return;
            const known = new Set(state.messages.map((m) => m._id));
            state.messages = [
                ...action.payload.messages.filter((m) => !known.has(m._id)),
                ...state.messages,
            ];
            state.hasMore = action.payload.hasMore;
        },

        setLoadingOlder: (state, action: PayloadAction<boolean>) => {
            state.loadingOlder = action.payload;
        },

        /** Live message: only shown if it belongs to the open conversation */
        addMessage: (state, action: PayloadAction<ChatMessage>) => {
            if (action.payload.roomId !== state.activeRoomId) return;
            if (!state.messages.some((m) => m._id === action.payload._id)) {
                state.messages.push(action.payload);
            }
        },

        /** The other side read the conversation: tick our messages as read */
        markMessagesRead: (
            state,
            action: PayloadAction<{ roomId: string; readerRole: "customer" | "admin" }>,
        ) => {
            if (action.payload.roomId !== state.activeRoomId) return;
            for (const message of state.messages) {
                if (message.senderRole !== action.payload.readerRole) {
                    message.status = "read";
                }
            }
        },

        roomClosed: (state, action: PayloadAction<string>) => {
            if (state.activeRoomId === action.payload) {
                state.roomStatus = "closed";
                state.typing = null;
            }
            state.rooms = state.rooms.filter((r) => r._id !== action.payload || state.roomFilter === "closed");
        },

        setRooms: (state, action: PayloadAction<ChatRoomSummary[]>) => {
            state.rooms = action.payload;
        },

        setRoomFilter: (state, action: PayloadAction<"open" | "closed">) => {
            state.roomFilter = action.payload;
        },

        setConnectionStatus: (state, action: PayloadAction<ChatState["connectionStatus"]>) => {
            state.connectionStatus = action.payload;
        },

        setIsLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },

        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },

        setUnreadCount: (state, action: PayloadAction<number>) => {
            state.unreadCount = action.payload;
        },

        setTyping: (state, action: PayloadAction<ChatState["typing"]>) => {
            state.typing = action.payload;
        },

        setGuest: (state, action: PayloadAction<{ id: string; name: string } | null>) => {
            state.guest = action.payload;
        },

        /** Reset the conversation state; keeps the window open/closed and the guest identity */
        clearChat: (state) => ({ ...initialState, isOpen: state.isOpen, guest: state.guest }),
    },
});

export const {
    toggleChat,
    setIsOpen,
    openChat,
    clearPendingRoom,
    enterRoom,
    leaveRoom,
    setActiveRoomId,
    setMessages,
    prependMessages,
    setLoadingOlder,
    addMessage,
    markMessagesRead,
    roomClosed,
    setRooms,
    setRoomFilter,
    setConnectionStatus,
    setIsLoading,
    setError,
    setUnreadCount,
    setTyping,
    setGuest,
    clearChat,
} = chatSlice.actions;

/** Display name for a conversation in the admin inbox */
export const roomDisplayName = (room: ChatRoomSummary | undefined): string =>
    room?.customerId?.name || (room?.guestName ? `${room.guestName} (guest)` : "Customer");

export default chatSlice.reducer;
