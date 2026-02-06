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
    Image,
    Alert,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { Send, RefreshCw, Check, CheckCheck, Image as ImageIcon } from "lucide-react-native";
import * as ImagePicker from 'expo-image-picker';
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
import { getApiUrl } from "../../utils/config";

const ChatScreen = () => {
    const dispatch = useDispatch<AppDispatch>();
    const { messages, connectionStatus, activeRoomId, isLoading } = useSelector(
        (state: RootState) => state.chat
    );
    const [inputMessage, setInputMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const flatListRef = useRef<FlatList>(null);
    // Use ref to avoid stale closure in socket callbacks
    const currentUserIdRef = useRef<string | null>(null);

    // Phase 2: Typing state
    const [typingText, setTypingText] = useState<string>("");
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Get current user ID before socket initialization
    useEffect(() => {
        const getUserId = async () => {
            const userId = await getItem("userId");
            setCurrentUserId(userId);
            currentUserIdRef.current = userId;
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
            // Mark as read immediately if we are in the screen
            // Use ref to avoid stale closure issue
            if (currentUserIdRef.current && message.senderId !== currentUserIdRef.current) {
                socket.emit("message-read", { roomId: message.roomId, messageIds: [message._id] });
            }
        });

        // Typing events
        socket.on("typing", (data: { userId: string; userRole: string }) => {
            if (data.userId !== currentUserId) {
                setTypingText("Support is typing...");
            }
        });

        socket.on("stop-typing", () => {
            setTypingText("");
        });

        // Message read receipt (optional update logic here)
        socket.on("message-read", () => { });

    }, [dispatch, currentUserId]);

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
                socketService.off("typing");
                socketService.off("stop-typing");
                socketService.off("message-read");
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

    // Handle Image Pick
    const handlePickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });

            if (!result.canceled && result.assets && result.assets.length > 0 && activeRoomId) {
                const asset = result.assets[0];

                // Upload
                const formData = new FormData();
                const uriParts = asset.uri.split('.');
                const fileType = uriParts[uriParts.length - 1];

                formData.append('image', {
                    uri: asset.uri,
                    name: `photo.${fileType}`,
                    type: `image/${fileType}`,
                } as any);

                dispatch(setIsLoading(true));

                // Use shared config for consistent URL across socket and REST API
                const token = await getItem('accessToken');
                const apiUrl = getApiUrl();
                const response = await fetch(`${apiUrl}/chat/upload`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'multipart/form-data',
                    },
                    body: formData,
                });

                const data = await response.json();

                if (data.success) {
                    socketService.emit(
                        "send-message",
                        {
                            roomId: activeRoomId,
                            content: "Sent an image",
                            attachments: [{ type: 'image', url: data.url }]
                        },
                        (res: { success: boolean; error?: string }) => {
                            if (!res.success) {
                                console.error("Failed to send image msg:", res.error);
                                Alert.alert("Error", "Failed to send image");
                            }
                        }
                    );
                } else {
                    Alert.alert("Upload Failed", data.message || "Unknown error");
                }
                dispatch(setIsLoading(false));
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to pick/upload image");
            dispatch(setIsLoading(false));
        }
    };

    // Handle Input Change
    const handleInputChange = (text: string) => {
        setInputMessage(text);

        if (!activeRoomId) return;
        const socket = socketService.getSocket();

        // Emit typing
        socket?.emit("typing", { roomId: activeRoomId });

        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

        typingTimeoutRef.current = setTimeout(() => {
            socket?.emit("stop-typing", { roomId: activeRoomId });
        }, 2000);
    };

    // Handle sending message
    const handleSendMessage = () => {
        const trimmedMessage = inputMessage.trim();

        if (!trimmedMessage || !activeRoomId || isSending) return;

        setIsSending(true);
        // Stop typing immediately
        socketService.getSocket()?.emit("stop-typing", { roomId: activeRoomId });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

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
                    {item.attachments?.map((att, idx) => (
                        att.type === 'image' && (
                            <Image
                                key={idx}
                                source={{ uri: att.url }}
                                style={{ width: 200, height: 150, borderRadius: 8, marginTop: 8 }}
                                resizeMode="cover"
                            />
                        )
                    ))}
                    <View style={styles.messageFooter}>
                        <Text style={[styles.timestamp, isOwn && styles.ownTimestamp]}>
                            {formattedTime}
                        </Text>
                        {isOwn && (
                            <View style={styles.statusIcon}>
                                {item.status === "read" ? (
                                    <CheckCheck size={14} color="#93c5fd" />
                                ) : item.status === "delivered" ? (
                                    <CheckCheck size={14} color="rgba(255,255,255,0.7)" />
                                ) : (
                                    <Check size={14} color="rgba(255,255,255,0.7)" />
                                )}
                            </View>
                        )}
                    </View>
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

                {/* Typing Indicator */}
                {typingText ? (
                    <View style={styles.typingContainer}>
                        <Text style={styles.typingText}>{typingText}</Text>
                    </View>
                ) : null}

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={inputMessage}
                        onChangeText={handleInputChange}
                        placeholder="Type a message..."
                        placeholderTextColor="#9ca3af"
                        multiline
                        maxLength={2000}
                        editable={connectionStatus === "connected"}
                    />
                    <TouchableOpacity
                        onPress={handlePickImage}
                        disabled={connectionStatus !== "connected"}
                        style={styles.attachButton}
                    >
                        <ImageIcon size={24} color="#6b7280" />
                    </TouchableOpacity>
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
    messageFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        marginTop: 4,
        gap: 4
    },
    timestamp: {
        fontSize: 11,
        color: "#9ca3af",
    },
    ownTimestamp: {
        color: "rgba(255, 255, 255, 0.7)",
    },
    statusIcon: {
        marginLeft: 2,
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
    attachButton: {
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
        padding: 4,
    },
    sendButtonDisabled: {
        opacity: 0.5,
    },
    typingContainer: {
        paddingHorizontal: 16,
        paddingVertical: 4,
    },
    typingText: {
        fontSize: 12,
        color: "#6b7280",
        fontStyle: "italic",
    }
});

export default ChatScreen;
