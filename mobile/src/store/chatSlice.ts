/**
 * Chat Redux Slice (Mobile)
 * State for the conversation on screen (customer support chat, or a room an admin opened).
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

/** Admin inbox entry (socket "get-rooms") */
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
    unreadCountAdmin: number;
    unreadCountCustomer: number;
}

interface ChatState {
    activeRoomId: string | null;
    roomStatus: "open" | "closed" | null;
    messages: ChatMessage[];
    hasMore: boolean;
    connectionStatus: "disconnected" | "connecting" | "connected" | "error";
    isLoading: boolean;
    error: string | null;
    unreadCount: number;
}

const initialState: ChatState = {
    activeRoomId: null,
    roomStatus: null,
    messages: [],
    hasMore: false,
    connectionStatus: "disconnected",
    isLoading: false,
    error: null,
    unreadCount: 0,
};

const chatSlice = createSlice({
    name: "chat",
    initialState,
    reducers: {
        enterRoom: (
            state,
            action: PayloadAction<{ roomId: string; status: "open" | "closed"; hasMore?: boolean }>,
        ) => {
            if (state.activeRoomId !== action.payload.roomId) state.messages = [];
            state.activeRoomId = action.payload.roomId;
            state.roomStatus = action.payload.status;
            state.hasMore = Boolean(action.payload.hasMore);
        },

        leaveRoom: (state) => {
            state.activeRoomId = null;
            state.roomStatus = null;
            state.messages = [];
            state.hasMore = false;
        },

        setActiveRoomId: (state, action: PayloadAction<string | null>) => {
            state.activeRoomId = action.payload;
        },

        /** Initial history (ignored if another room is on screen by now) */
        setMessages: (
            state,
            action: PayloadAction<{ roomId: string; messages: ChatMessage[]; hasMore?: boolean }>,
        ) => {
            if (action.payload.roomId !== state.activeRoomId) return;
            state.messages = action.payload.messages;
            state.hasMore = Boolean(action.payload.hasMore);
        },

        prependMessages: (
            state,
            action: PayloadAction<{ roomId: string; messages: ChatMessage[]; hasMore: boolean }>,
        ) => {
            if (action.payload.roomId !== state.activeRoomId) return;
            const known = new Set(state.messages.map((m) => m._id));
            state.messages = [...action.payload.messages.filter((m) => !known.has(m._id)), ...state.messages];
            state.hasMore = action.payload.hasMore;
        },

        /** Live message: only for the conversation on screen */
        addMessage: (state, action: PayloadAction<ChatMessage>) => {
            if (action.payload.roomId !== state.activeRoomId) return;
            if (!state.messages.some((m) => m._id === action.payload._id)) {
                state.messages.push(action.payload);
            }
        },

        markMessagesRead: (
            state,
            action: PayloadAction<{ roomId: string; readerRole: "customer" | "admin" }>,
        ) => {
            if (action.payload.roomId !== state.activeRoomId) return;
            for (const message of state.messages) {
                if (message.senderRole !== action.payload.readerRole) message.status = "read";
            }
        },

        roomClosed: (state, action: PayloadAction<string>) => {
            if (state.activeRoomId === action.payload) state.roomStatus = "closed";
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

        clearChat: () => initialState,
    },
});

export const {
    enterRoom,
    leaveRoom,
    setActiveRoomId,
    setMessages,
    prependMessages,
    addMessage,
    markMessagesRead,
    roomClosed,
    setConnectionStatus,
    setIsLoading,
    setError,
    setUnreadCount,
    clearChat,
} = chatSlice.actions;

/** Display name for a conversation in the admin inbox */
export const roomDisplayName = (room: ChatRoomSummary): string =>
    room.customerId?.name || (room.guestName ? `${room.guestName} (guest)` : "Customer");

export default chatSlice.reducer;
