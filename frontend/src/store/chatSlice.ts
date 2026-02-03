/**
 * Chat Redux Slice
 * Manages real-time chat state
 */
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

// Message interface
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

// Chat state interface
interface ChatState {
    isOpen: boolean;
    activeRoomId: string | null;
    messages: ChatMessage[];
    connectionStatus: "disconnected" | "connecting" | "connected" | "error";
    isLoading: boolean;
    error: string | null;
    unreadCount: number;
    typingUsers: string[]; // List of user IDs currently typing
}

const initialState: ChatState = {
    isOpen: false,
    activeRoomId: null,
    messages: [],
    connectionStatus: "disconnected",
    isLoading: false,
    error: null,
    unreadCount: 0,
    typingUsers: [],
};

const chatSlice = createSlice({
    name: "chat",
    initialState,
    reducers: {
        // Toggle chat widget open/close
        toggleChat: (state) => {
            state.isOpen = !state.isOpen;
        },

        // Set chat open state
        setIsOpen: (state, action: PayloadAction<boolean>) => {
            state.isOpen = action.payload;
        },

        // Set active room ID
        setActiveRoomId: (state, action: PayloadAction<string | null>) => {
            state.activeRoomId = action.payload;
        },

        // Set all messages (for initial load)
        setMessages: (state, action: PayloadAction<ChatMessage[]>) => {
            state.messages = action.payload;
        },

        // Add a single message
        addMessage: (state, action: PayloadAction<ChatMessage>) => {
            // Avoid duplicates
            const exists = state.messages.some((m) => m._id === action.payload._id);
            if (!exists) {
                state.messages.push(action.payload);
            }
        },

        // Set connection status
        setConnectionStatus: (
            state,
            action: PayloadAction<ChatState["connectionStatus"]>
        ) => {
            state.connectionStatus = action.payload;
        },

        // Set loading state
        setIsLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },

        // Set error
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },

        // Clear chat state (on logout)
        clearChat: (state) => {
            state.isOpen = false;
            state.activeRoomId = null;
            state.messages = [];
            state.connectionStatus = "disconnected";
            state.isLoading = false;
            state.error = null;
            state.unreadCount = 0;
            state.typingUsers = [];
        },

        // Update message status (e.g., mark as read)
        updateMessageStatus: (state, action: PayloadAction<{ messageId: string; status: "sent" | "delivered" | "read" }>) => {
            const msg = state.messages.find(m => m._id === action.payload.messageId);
            if (msg) {
                msg.status = action.payload.status;
            }
        },

        // Update unread count
        setUnreadCount: (state, action: PayloadAction<number>) => {
            state.unreadCount = action.payload;
        },

        incrementUnreadCount: (state) => {
            state.unreadCount += 1;
        },

        // Typing indicators
        setTypingUser: (state, action: PayloadAction<{ userId: string; isTyping: boolean }>) => {
            if (action.payload.isTyping) {
                if (!state.typingUsers.includes(action.payload.userId)) {
                    state.typingUsers.push(action.payload.userId);
                }
            } else {
                state.typingUsers = state.typingUsers.filter(id => id !== action.payload.userId);
            }
        },
    },
});

export const {
    toggleChat,
    setIsOpen,
    setActiveRoomId,
    setMessages,
    addMessage,
    setConnectionStatus,
    setIsLoading,
    setError,
    clearChat,
    updateMessageStatus,
    setUnreadCount,
    incrementUnreadCount,
    setTypingUser,
} = chatSlice.actions;

export default chatSlice.reducer;
