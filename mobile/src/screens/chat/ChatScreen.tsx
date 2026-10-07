/**
 * ChatScreen
 * Real-time support chat. Customers see their own conversation; admins open a
 * specific room from the inbox (route param `roomId`).
 */
import React, { useEffect, useCallback, useState, useRef, useLayoutEffect } from "react";
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
    Keyboard,
} from "react-native";
import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { Send, RefreshCw, Check, CheckCheck, Image as ImageIcon } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";
import { RootState, AppDispatch } from "../../store";
import {
    enterRoom,
    leaveRoom,
    setMessages,
    prependMessages,
    addMessage,
    markMessagesRead,
    roomClosed,
    setConnectionStatus,
    setIsLoading,
    ChatMessage,
} from "../../store/chatSlice";
import socketService, { AckResponse } from "../../services/socketService";
import api from "../../api/axios";
import { playTypingSoundDebounced, playMessageSound } from "../../utils/soundUtils";
import { colors } from "../../theme";

interface ChatRouteParams {
    roomId?: string;
    customerName?: string;
}

interface JoinResponse extends AckResponse {
    roomId?: string;
    status?: "open" | "closed";
    // The conversation's latest messages come with the join itself
    messages?: ChatMessage[];
    hasMore?: boolean;
}

const MAX_MESSAGE_LENGTH = 2000;

const ChatScreen = () => {
    const dispatch = useDispatch<AppDispatch>();
    const navigation = useNavigation();
    const route = useRoute();
    const { roomId: requestedRoomId, customerName } = (route.params || {}) as ChatRouteParams;

    const { messages, connectionStatus, activeRoomId, roomStatus, isLoading, hasMore } = useSelector(
        (state: RootState) => state.chat,
    );
    const user = useSelector((state: RootState) => state.auth.user);
    const currentUserId = user?._id;
    const isAdmin = user?.role === "admin";

    const [inputMessage, setInputMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [typingText, setTypingText] = useState("");
    const flatListRef = useRef<FlatList>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const typingClearRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const lastMessageIdRef = useRef<string | undefined>(undefined);
    const currentUserIdRef = useRef(currentUserId);
    const activeRoomIdRef = useRef(activeRoomId);

    useEffect(() => {
        currentUserIdRef.current = currentUserId;
    }, [currentUserId]);
    useEffect(() => {
        activeRoomIdRef.current = activeRoomId;
    }, [activeRoomId]);

    const joinRoom = useCallback(async () => {
        dispatch(setIsLoading(true));
        const res = await socketService.request<JoinResponse>(
            "join-chat",
            requestedRoomId ? { roomId: requestedRoomId } : {},
        );
        dispatch(setIsLoading(false));
        if (res.success && res.roomId) {
            dispatch(enterRoom({ roomId: res.roomId, status: res.status ?? "open", hasMore: res.hasMore }));
            // History arrives with the join: a separate "chat-history" event can
            // reach us before the room is active and would be dropped
            if (res.messages) dispatch(setMessages({ roomId: res.roomId, messages: res.messages, hasMore: res.hasMore }));
            socketService.send("message-read", { roomId: res.roomId });
        } else {
            Alert.alert("Chat", res.error || "Could not open the conversation");
        }
    }, [dispatch, requestedRoomId]);

    // Connect and listen while the screen is focused
    useFocusEffect(
        useCallback(() => {
            const socket = socketService.connect();
            dispatch(setConnectionStatus(socket.connected ? "connected" : "connecting"));

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const handlers: Record<string, (...args: any[]) => void> = {
                connect: () => {
                    dispatch(setConnectionStatus("connected"));
                    joinRoom();
                },
                connect_error: () => {
                    dispatch(setConnectionStatus("error"));
                    dispatch(setIsLoading(false));
                },
                disconnect: () => dispatch(setConnectionStatus("disconnected")),
                "chat-history": (data: { roomId: string; messages: ChatMessage[]; hasMore?: boolean }) =>
                    dispatch(setMessages(data)),
                "new-message": (message: ChatMessage) => {
                    if (message.roomId !== activeRoomIdRef.current) return;
                    dispatch(addMessage(message));
                    setTypingText("");
                    if (message.senderId !== currentUserIdRef.current) {
                        socketService.send("message-read", { roomId: message.roomId });
                        playMessageSound();
                    }
                },
                "message-read": (data: { roomId: string; readerRole: "customer" | "admin" }) =>
                    dispatch(markMessagesRead(data)),
                "room-closed": (data: { roomId: string }) => dispatch(roomClosed(data.roomId)),
                typing: (data: { roomId: string; userRole: string }) => {
                    if (data.roomId !== activeRoomIdRef.current) return;
                    setTypingText(
                        data.userRole === "admin"
                            ? isAdmin ? "Another admin is typing..." : "Support is typing..."
                            : `${customerName || "Customer"} is typing...`,
                    );
                    playTypingSoundDebounced();
                    if (typingClearRef.current) clearTimeout(typingClearRef.current);
                    typingClearRef.current = setTimeout(() => setTypingText(""), 5000);
                },
                "stop-typing": () => setTypingText(""),
            };

            for (const [event, handler] of Object.entries(handlers)) socket.on(event, handler);
            if (socket.connected) joinRoom();

            return () => {
                for (const [event, handler] of Object.entries(handlers)) socket.off(event, handler);
                if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
                if (typingClearRef.current) clearTimeout(typingClearRef.current);
                socketService.request("leave-chat");
                dispatch(leaveRoom());
            };
        }, [dispatch, joinRoom, isAdmin, customerName]),
    );

    // Admins: "Close" conversation in the header
    const handleCloseConversation = useCallback(() => {
        if (!activeRoomId) return;
        Alert.alert("Close conversation", "The customer will start a new conversation next time.", [
            { text: "Cancel", style: "cancel" },
            {
                text: "Close",
                style: "destructive",
                onPress: async () => {
                    const res = await socketService.request("close-room", { roomId: activeRoomId });
                    if (res.success) navigation.goBack();
                    else Alert.alert("Chat", res.error || "Could not close the conversation");
                },
            },
        ]);
    }, [activeRoomId, navigation]);

    useLayoutEffect(() => {
        navigation.setOptions({
            title: isAdmin ? customerName || "Customer" : "Support Chat",
            headerRight:
                isAdmin && roomStatus === "open"
                    ? () => (
                        <TouchableOpacity onPress={handleCloseConversation} style={styles.headerButton}>
                            <Text style={styles.headerButtonText}>Close</Text>
                        </TouchableOpacity>
                    )
                    : undefined,
        });
    }, [navigation, isAdmin, customerName, roomStatus, handleCloseConversation]);

    // Scroll to the bottom only when a new message arrives (not when older ones load)
    useEffect(() => {
        const lastId = messages[messages.length - 1]?._id;
        if (lastId && lastId !== lastMessageIdRef.current) {
            setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
        lastMessageIdRef.current = lastId;
    }, [messages]);

    // Keep the input visible when the keyboard opens
    useEffect(() => {
        const keyboardShow = Keyboard.addListener(
            Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
            () => setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150),
        );
        return () => keyboardShow.remove();
    }, []);

    /** Send text and/or image; every failure is shown to the user */
    const sendMessage = async (payload: { content?: string; attachments?: { type: "image"; url: string }[] }) => {
        if (!activeRoomId) return false;
        const res = await socketService.request("send-message", { roomId: activeRoomId, ...payload });
        if (res.success) return true;
        if (res.code === "ROOM_CLOSED") dispatch(roomClosed(activeRoomId));
        Alert.alert("Message not sent", res.error || "Please try again");
        return false;
    };

    const handlePickImage = async () => {
        if (!activeRoomId) return;
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                quality: 0.8,
            });
            if (result.canceled || !result.assets?.length) return;

            const asset = result.assets[0];
            const extension = asset.uri.split(".").pop() || "jpg";
            const formData = new FormData();
            formData.append("image", {
                uri: asset.uri,
                name: `photo.${extension}`,
                type: asset.mimeType || `image/${extension}`,
            } as unknown as Blob);

            setIsUploading(true);
            // The shared axios instance refreshes an expired token automatically
            const { data } = await api.post("/chat/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            const url: string | undefined = data?.data?.url ?? data?.url;
            if (!url) throw new Error("Upload failed");
            await sendMessage({ attachments: [{ type: "image", url }] });
        } catch (error) {
            const message = (error as { response?: { data?: { message?: string } } })?.response?.data?.message;
            Alert.alert("Upload failed", message || "Could not send the image");
        } finally {
            setIsUploading(false);
        }
    };

    const stopTyping = () => {
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
        if (activeRoomId) socketService.send("stop-typing", { roomId: activeRoomId });
    };

    const handleInputChange = (text: string) => {
        setInputMessage(text);
        if (!activeRoomId) return;
        if (!typingTimeoutRef.current) socketService.send("typing", { roomId: activeRoomId });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(stopTyping, 2000);
    };

    const handleSendMessage = async () => {
        const content = inputMessage.trim();
        if (!content || !activeRoomId || isSending) return;
        setIsSending(true);
        stopTyping();
        if (await sendMessage({ content })) setInputMessage("");
        setIsSending(false);
    };

    const handleLoadOlder = async () => {
        if (!activeRoomId || !messages[0] || loadingOlder) return;
        setLoadingOlder(true);
        const res = await socketService.request<AckResponse & { messages?: ChatMessage[]; hasMore?: boolean }>(
            "load-messages",
            { roomId: activeRoomId, before: messages[0].createdAt },
        );
        setLoadingOlder(false);
        if (res.success && res.messages) {
            dispatch(prependMessages({ roomId: activeRoomId, messages: res.messages, hasMore: Boolean(res.hasMore) }));
        }
    };

    const handleStartNewConversation = () => {
        dispatch(leaveRoom());
        joinRoom();
    };

    const renderMessage = ({ item }: { item: ChatMessage }) => {
        const isOwn = item.senderId === currentUserId;
        const formattedTime = new Date(item.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });

        return (
            <View style={[styles.messageContainer, isOwn ? styles.ownMessageContainer : styles.otherMessageContainer]}>
                <View style={[styles.messageBubble, isOwn ? styles.ownBubble : styles.otherBubble]}>
                    {!isOwn && (
                        <Text style={styles.senderLabel}>
                            {item.senderRole === "admin" ? "Support" : customerName || "Customer"}
                        </Text>
                    )}
                    {!!item.content && (
                        <Text style={[styles.messageText, isOwn && styles.ownMessageText]}>{item.content}</Text>
                    )}
                    {item.attachments?.map((att, idx) =>
                        att.type === "image" ? (
                            <Image
                                key={idx}
                                source={{ uri: att.url }}
                                style={[styles.attachment, !!item.content && styles.attachmentWithText]}
                                resizeMode="cover"
                                accessibilityLabel="Shared image"
                            />
                        ) : null,
                    )}
                    <View style={styles.messageFooter}>
                        <Text style={[styles.timestamp, isOwn && styles.ownTimestamp]}>{formattedTime}</Text>
                        {isOwn && (
                            <View style={styles.statusIcon} accessibilityLabel={item.status === "read" ? "Read" : "Sent"}>
                                {item.status === "read" ? (
                                    <CheckCheck size={14} color="#93c5fd" />
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

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Start the conversation!</Text>
        </View>
    );

    const renderLoadEarlier = () =>
        hasMore ? (
            <TouchableOpacity onPress={handleLoadOlder} disabled={loadingOlder} style={styles.loadEarlier}>
                <Text style={styles.loadEarlierText}>{loadingOlder ? "Loading..." : "Load earlier messages"}</Text>
            </TouchableOpacity>
        ) : null;

    const renderStatusBanner = () => {
        if (connectionStatus === "connected") return null;
        return (
            <View style={[styles.statusBanner, connectionStatus === "error" && styles.errorBanner]}>
                <Text style={styles.statusText}>
                    {connectionStatus === "connecting" ? "Connecting..." : "Connection lost"}
                </Text>
                {connectionStatus !== "connecting" && (
                    <TouchableOpacity onPress={() => socketService.connect()} style={styles.retryButton}>
                        <RefreshCw size={16} color="#fff" />
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    const connected = connectionStatus === "connected";
    const canWrite = connected && roomStatus === "open";
    const sendDisabled = !inputMessage.trim() || isSending || !canWrite;

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                style={styles.keyboardView}
                behavior="padding"
                keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 80}
            >
                {renderStatusBanner()}

                {isLoading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : (
                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        renderItem={renderMessage}
                        keyExtractor={(item) => item._id}
                        contentContainerStyle={[styles.messagesList, messages.length === 0 && styles.emptyList]}
                        ListHeaderComponent={renderLoadEarlier}
                        ListEmptyComponent={renderEmptyState}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="interactive"
                    />
                )}

                {typingText ? (
                    <View style={styles.typingContainer}>
                        <Text style={styles.typingText}>{typingText}</Text>
                    </View>
                ) : null}

                {roomStatus === "closed" ? (
                    <View style={styles.closedBanner}>
                        <Text style={styles.closedText}>This conversation has been closed.</Text>
                        {!isAdmin && (
                            <TouchableOpacity onPress={handleStartNewConversation}>
                                <Text style={styles.closedAction}>Start a new conversation</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <View style={styles.inputContainer}>
                        <View style={styles.inputWrapper}>
                            <TextInput
                                style={styles.input}
                                value={inputMessage}
                                onChangeText={handleInputChange}
                                placeholder="Type a message..."
                                placeholderTextColor="#9ca3af"
                                multiline
                                maxLength={MAX_MESSAGE_LENGTH}
                                editable={canWrite}
                                selectionColor={colors.primary}
                                textAlignVertical="center"
                            />
                            <TouchableOpacity
                                onPress={handlePickImage}
                                disabled={!canWrite || isUploading}
                                style={styles.attachButton}
                                accessibilityLabel="Send image"
                            >
                                {isUploading ? (
                                    <ActivityIndicator size="small" color="#6b7280" />
                                ) : (
                                    <ImageIcon size={20} color="#6b7280" />
                                )}
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity
                            onPress={handleSendMessage}
                            disabled={sendDisabled}
                            style={[styles.sendButton, sendDisabled && styles.sendButtonDisabled]}
                            accessibilityLabel="Send message"
                        >
                            <Send size={20} color="#fff" />
                        </TouchableOpacity>
                    </View>
                )}
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
    loadEarlier: {
        alignSelf: "center",
        paddingVertical: 8,
        marginBottom: 8,
    },
    loadEarlierText: {
        color: colors.primary,
        fontSize: 13,
        fontWeight: "500",
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
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
    },
    otherBubble: {
        backgroundColor: "#f3f4f6",
        borderBottomLeftRadius: 4,
    },
    senderLabel: {
        fontSize: 12,
        color: colors.primary,
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
    attachment: {
        width: 200,
        height: 150,
        borderRadius: 8,
    },
    attachmentWithText: {
        marginTop: 8,
    },
    messageFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        marginTop: 4,
        gap: 4,
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
    closedBanner: {
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        alignItems: "center",
        gap: 8,
    },
    closedText: {
        color: "#6b7280",
        fontSize: 14,
    },
    closedAction: {
        color: colors.primary,
        fontWeight: "600",
        fontSize: 14,
    },
    inputContainer: {
        flexDirection: "row",
        padding: 12,
        borderTopWidth: 1,
        borderTopColor: "#e5e7eb",
        alignItems: "flex-end",
        backgroundColor: "#fff",
    },
    inputWrapper: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#f9fafb",
        borderRadius: 24,
        borderWidth: 1,
        borderColor: "#e5e7eb",
        paddingHorizontal: 12,
        minHeight: 44,
    },
    input: {
        flex: 1,
        fontSize: 15,
        maxHeight: 100,
        color: "#111827",
        paddingVertical: 8,
    },
    sendButton: {
        backgroundColor: colors.primary,
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 3,
    },
    attachButton: {
        justifyContent: "center",
        alignItems: "center",
        marginLeft: 8,
        paddingVertical: 6,
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
    },
    headerButton: {
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    headerButtonText: {
        color: "#DC2626",
        fontWeight: "600",
        fontSize: 15,
    },
});

export default ChatScreen;
