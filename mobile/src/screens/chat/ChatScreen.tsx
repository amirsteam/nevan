/**
 * ChatScreen
 * Real-time chat with customer support
 */
import React, { useEffect, useCallback, useState, useRef } from "react";
import {
    View,
    Text,
    FlatList,
    TextInput,
    TouchableOpacity,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    ActivityIndicator,
    SafeAreaView,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { Send, RefreshCw } from "lucide-react-native";
import { RootState, AppDispatch } from "../../store";
import {
    setActiveRoomId,
    setMessages,
    addMessage,
    setConnectionStatus,
    setIsLoading,
    ChatMessage,
} from "../../store/chatSlice";
import socketService from "../../services/socketService";
import { getItem } from "../../utils/storage";

const ChatScreen = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { messages, connectionStatus, activeRoomId, isLoading } = useSelector(
        (state: RootState) => state.chat
    );
    const [inputMessage, setInputMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);

    // Get current user ID
    useEffect(() => {
        const getUserId = async () => {
            const userId = await getItem("userId");
            setCurrentUserId(userId);
        };
        getUserId();
    }, []);

    // Initialize socket connection
    const initializeChat = useCallback(async () => {
        dispatch(setIsLoading(true));
        dispatch(setConnectionStatus("connecting"));

        const socket = await socketService.connect();

        if (!socket) {
            dispatch(setConnectionStatus("error"));
            dispatch(setIsLoading(false));
            return;
        }

        // Handle connection events
        socket.on("connect", () => {
            dispatch(setConnectionStatus("connected"));

            // Join chat room
            socketService.emit(
                "join-chat",
                {},
                (response: { success: boolean; roomId?: string; error?: string }) => {
                    dispatch(setIsLoading(false));
                    if (response.success && response.roomId) {
                        dispatch(setActiveRoomId(response.roomId));
                    } else {
                        console.error("Failed to join chat:", response.error);
                    }
                }
            );
        });

        socket.on("connect_error", () => {
            dispatch(setConnectionStatus("error"));
            dispatch(setIsLoading(false));
        });

        socket.on("disconnect", () => {
            dispatch(setConnectionStatus("disconnected"));
        });

        // Handle incoming messages
        socket.on(
            "chat-history",
            (data: { roomId: string; messages: ChatMessage[] }) => {
                dispatch(setMessages(data.messages));
            }
        );

        socket.on("new-message", (message: ChatMessage) => {
            dispatch(addMessage(message));
        });
    }, [dispatch]);

    // Connect on focus, disconnect on blur
    useFocusEffect(
        useCallback(() => {
            initializeChat();

            return () => {
                socketService.off("connect");
                socketService.off("connect_error");
                socketService.off("disconnect");
                socketService.off("chat-history");
                socketService.off("new-message");
                socketService.disconnect();
            };
        }, [initializeChat])
    );

    // Scroll to bottom on new messages
    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [messages]);

    // Handle sending message
    const handleSendMessage = () => {
        const trimmedMessage = inputMessage.trim();

        if (!trimmedMessage || !activeRoomId || isSending) return;

        setIsSending(true);

        socketService.emit(
            "send-message",
            { roomId: activeRoomId, content: trimmedMessage },
            (response: { success: boolean; error?: string }) => {
                setIsSending(false);
                if (response.success) {
                    setInputMessage("");
                } else {
                    console.error("Failed to send message:", response.error);
                }
            }
        );
    };

    // Render message item
    const renderMessage = ({ item }: { item: ChatMessage }) => {
        const isOwn = item.senderId === currentUserId;
        const formattedTime = new Date(item.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });

        return (
            <View
                style={[
                    styles.messageContainer,
                    isOwn ? styles.ownMessageContainer : styles.otherMessageContainer,
                ]}
            >
                <View
                    style={[
                        styles.messageBubble,
                        isOwn ? styles.ownBubble : styles.otherBubble,
                    ]}
                >
                    {!isOwn && (
                        <Text style={styles.senderLabel}>
                            {item.senderRole === "admin" ? "Support" : "Customer"}
                        </Text>
                    )}
                    <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>
                        {item.content}
                    </Text>
                    <Text style={[styles.timestamp, isOwn && styles.ownTimestamp]}>
                        {formattedTime}
                    </Text>
                </View>
            </View>
        );
    };

    // Render empty state
    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
        </View>
    );

    // Connection status banner
    const renderStatusBanner = () => {
        if (connectionStatus === "connected") return null;

        return (
            <View
                style={[
                    styles.statusBanner,
                    connectionStatus === "error" && styles.errorBanner,
                ]}
            >
                <Text style={styles.statusText}>
                    {connectionStatus === "connecting"
                        ? "Connecting..."
                        : "Connection lost"}
                </Text>
                {connectionStatus === "error" && (
                    <TouchableOpacity onPress={initializeChat} style={styles.retryButton}>
                        <RefreshCw size={16} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
            >
                {renderStatusBanner()}

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6366f1" />
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={[
                            styles.messagesList,
                            messages.length === 0 && styles.emptyList,
                        ]}
                        ListEmptyComponent={renderEmptyState}
                        showsVerticalScrollIndicator={false}
                    />
                )}

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputMessage}
                        onChangeText={setInputMessage}
                        placeholder="Type a message..."
                        placeholderTextColor="#9ca3af"
                        multiline
                        maxLength={2000}
                        editable={connectionStatus === "connected"}
                    />
                    <TouchableOpacity
                        onPress={handleSendMessage}
                        disabled={
                            !inputMessage.trim() ||
                            isSending ||
                            connectionStatus !== "connected"
                        }
                        style={[
                            styles.sendButton,
                            (!inputMessage.trim() ||
                                isSending ||
                                connectionStatus !== "connected") &&
                            styles.sendButtonDisabled,
                        ]}
                    >
                        <Send size={20} color="#fff" />
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#fff",
    },
    keyboardView: {
        flex: 1,
    },
    statusBanner: {
        backgroundColor: "#fbbf24",
        padding: 8,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
    },
    errorBanner: {
        backgroundColor: "#ef4444",
    },
    statusText: {
        color: "#fff",
        fontSize: 14,
        fontWeight: "500",
    },
    retryButton: {
        marginLeft: 8,
        padding: 4,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    messagesList: {
        padding: 16,
        flexGrow: 1,
    },
    emptyList: {
        justifyContent: "center",
    },
    emptyContainer: {
        alignItems: "center",
        justifyContent: "center",
    },
    emptyEmoji: {
        fontSize: 48,
        marginBottom: 8,
    },
    emptyText: {
        fontSize: 16,
        color: "#6b7280",
        fontWeight: "500",
    },
    emptySubtext: {
        fontSize: 14,
        color: "#9ca3af",
    },
    messageContainer: {
        marginBottom: 12,
        maxWidth: "80%",
    },
    ownMessageContainer: {
        alignSelf: "flex-end",
    },
    otherMessageContainer: {
        alignSelf: "flex-start",
    },
    messageBubble: {
        borderRadius: 16,
        padding: 12,
        paddingBottom: 8,
    },
    ownBubble: {
        backgroundColor: "#6366f1",
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        backgroundColor: "#f3f4f6",
        borderBottomLeftRadius: 4,
    },
    senderLabel: {
        fontSize: 12,
        color: "#6366f1",
        fontWeight: "600",
        marginBottom: 4,
    },
    messageText: {
        fontSize: 15,
        color: "#1f2937",
        lineHeight: 20,
    },
    ownMessageText: {
        color: "#fff",
    },
    timestamp: {
        fontSize: 11,
        color: "#9ca3af",
        marginTop: 4,
        alignSelf: "flex-end",
    },
    ownTimestamp: {
        color: "rgba(255, 255, 255, 0.7)",
    },
    inputContainer: {
        flexDirection: "row",
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        alignItems: "flex-end",
    },
    input: {
        flex: 1,
        backgroundColor: "#f3f4f6",
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        maxHeight: 100,
        color: "#1f2937",
    },
    sendButton: {
        backgroundColor: "#6366f1",
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
});

export default ChatScreen;
