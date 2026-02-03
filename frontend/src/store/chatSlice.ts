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
}

const initialState: ChatState = {
    isOpen: false,
    activeRoomId: null,
    messages: [],
    connectionStatus: "disconnected",
    isLoading: false,
    error: null,
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
} = chatSlice.actions;

export default chatSlice.reducer;
