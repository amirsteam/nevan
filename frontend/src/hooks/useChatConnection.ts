/**
 * Keeps the support-chat connection alive for the signed-in user — or for a
 * signed-out visitor who started a guest chat — and feeds the chat store: unread
 * badge, admin inbox, live messages, read receipts, typing.
 * Mounted once (ChatWidget) so badges update while the chat window is closed.
 */
import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { store } from "../store";
import socketService from "../services/socketService";
import {
    addMessage,
    clearChat,
    ChatMessage,
    ChatRoomSummary,
    markMessagesRead,
    roomClosed,
    setConnectionStatus,
    setMessages,
    setRooms,
    setTyping,
    setUnreadCount,
    setGuest,
} from "../store/chatSlice";
import { loadGuestSession, clearGuestSession } from "../utils/guestChat";
import { playMessageSound, playTypingSoundDebounced } from "../utils/soundUtils";

/** Re-fetch the admin inbox for the current filter */
export const refreshRooms = async (): Promise<void> => {
    const { roomFilter } = store.getState().chat;
    const res = await socketService.request<{ success: boolean; rooms?: ChatRoomSummary[] }>(
        "get-rooms",
        { status: roomFilter },
    );
    if (res.success && res.rooms) store.dispatch(setRooms(res.rooms));
};

export const useChatConnection = (): void => {
    const { isAuthenticated, user, loading: authLoading } = useAuth();
    const dispatch = useAppDispatch();
    const isOpen = useAppSelector((state) => state.chat.isOpen);
    const guest = useAppSelector((state) => state.chat.guest);
    const isAdmin = user?.role === "admin";
    // Who is chatting: the signed-in user, else the visitor's guest session
    const selfId = isAuthenticated ? user?._id : guest?.id;
    const identity = authLoading ? null : isAuthenticated ? `user:${user?._id}` : guest ? `guest:${guest.id}` : null;
    const selfIdRef = useRef<string | undefined>(selfId);

    useEffect(() => {
        selfIdRef.current = selfId;
    }, [selfId]);

    // Pick up a guest session saved earlier (page reload), and forget an expired one
    useEffect(() => {
        if (authLoading || isAuthenticated) return;
        const saved = loadGuestSession();
        dispatch(setGuest(saved ? { id: saved.id, name: saved.name } : null));
        const onExpired = () => dispatch(setGuest(null));
        window.addEventListener("chat-guest-expired", onExpired);
        return () => window.removeEventListener("chat-guest-expired", onExpired);
    }, [authLoading, isAuthenticated, dispatch]);

    useEffect(() => {
        // Identity changed (sign-in, sign-out, guest chat started): start a fresh connection
        socketService.disconnect();
        dispatch(clearChat());
        if (!identity) return;

        const socket = socketService.connect();
        if (!socket) return;
        dispatch(setConnectionStatus(socket.connected ? "connected" : "connecting"));

        let typingTimer: ReturnType<typeof setTimeout> | undefined;

        const onConnect = async () => {
            dispatch(setConnectionStatus("connected"));

            // A visitor who chatted as a guest and then signed in keeps that conversation
            const guestSession = isAuthenticated && !isAdmin ? loadGuestSession() : null;
            if (guestSession) {
                const claim = await socketService.request("claim-guest-chat", { guestToken: guestSession.token });
                if (claim.success) clearGuestSession();
            }

            const unread = await socketService.request<{ success: boolean; count?: number }>("get-unread");
            if (unread.success) dispatch(setUnreadCount(unread.count ?? 0));

            // After a reconnect, re-open the conversation that was on screen
            const { activeRoomId, isOpen: windowOpen } = store.getState().chat;
            if (windowOpen && activeRoomId) {
                socketService.request("join-chat", isAdmin ? { roomId: activeRoomId } : {});
            }
            if (isAdmin) refreshRooms();
        };

        const onNewMessage = (message: ChatMessage) => {
            const { activeRoomId, isOpen: windowOpen } = store.getState().chat;
            if (message.roomId !== activeRoomId) return;

            dispatch(addMessage(message));
            dispatch(setTyping(null));
            if (message.senderId !== selfIdRef.current) {
                playMessageSound();
                if (windowOpen) socketService.send("message-read", { roomId: message.roomId });
            }
        };

        // Socket.IO listeners take loosely typed payloads
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const handlers: Record<string, (...args: any[]) => void> = {
            connect: onConnect,
            disconnect: () => dispatch(setConnectionStatus("disconnected")),
            connect_error: () => dispatch(setConnectionStatus("error")),
            "chat-history": (data: { roomId: string; messages: ChatMessage[]; hasMore?: boolean }) =>
                dispatch(setMessages(data)),
            "new-message": onNewMessage,
            "message-read": (data: { roomId: string; readerRole: "customer" | "admin" }) =>
                dispatch(markMessagesRead(data)),
            "unread-updated": (data: { count: number }) => dispatch(setUnreadCount(data.count)),
            "rooms-updated": () => {
                if (isAdmin && store.getState().chat.isOpen) refreshRooms();
            },
            "room-closed": (data: { roomId: string }) => dispatch(roomClosed(data.roomId)),
            typing: (data: { roomId: string; userRole: "customer" | "admin" }) => {
                if (data.roomId !== store.getState().chat.activeRoomId) return;
                dispatch(setTyping({ roomId: data.roomId, role: data.userRole }));
                playTypingSoundDebounced();
                // Clear the indicator if "stop-typing" never arrives
                clearTimeout(typingTimer);
                typingTimer = setTimeout(() => dispatch(setTyping(null)), 5000);
            },
            "stop-typing": () => dispatch(setTyping(null)),
        };

        for (const [event, handler] of Object.entries(handlers)) socket.on(event, handler);
        if (socket.connected) onConnect();

        return () => {
            clearTimeout(typingTimer);
            for (const [event, handler] of Object.entries(handlers)) socket.off(event, handler);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [identity, dispatch]);

    // Closing the window leaves the conversation; the badge keeps counting via "unread-updated"
    const wasOpen = useRef(isOpen);
    useEffect(() => {
        if (wasOpen.current && !isOpen) socketService.request("leave-chat");
        wasOpen.current = isOpen;
    }, [isOpen]);
};

export default useChatConnection;
