/**
 * Admin chat inbox: open and closed customer conversations, live-updated.
 * Any admin can open and reply to any conversation.
 */
import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { MessageCircle } from "lucide-react-native";
import socketService, { AckResponse } from "../../services/socketService";
import type { ChatRoomSummary } from "../../store/chatSlice";
import type { AdminChatRoomsScreenProps } from "../../navigation/types";

const formatTime = (iso?: string) => {
  if (!iso) return "";
  const date = new Date(iso);
  return date.toDateString() === new Date().toDateString()
    ? date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const AdminChatRoomsScreen: React.FC<AdminChatRoomsScreenProps> = ({ navigation }) => {
  const [filter, setFilter] = useState<"open" | "closed">("open");
  const [rooms, setRooms] = useState<ChatRoomSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRooms = useCallback(async () => {
    const res = await socketService.request<AckResponse & { rooms?: ChatRoomSummary[] }>("get-rooms", {
      status: filter,
    });
    if (res.success && res.rooms) {
      setRooms(res.rooms);
      setError(null);
    } else {
      setError(res.error || "Could not load conversations");
    }
    setLoading(false);
  }, [filter]);

  // Live updates while the inbox is on screen
  useFocusEffect(
    useCallback(() => {
      const socket = socketService.connect();
      const onUpdate = () => loadRooms();
      socket.on("connect", onUpdate);
      socket.on("rooms-updated", onUpdate);
      if (socket.connected) loadRooms();
      else setLoading(true);
      return () => {
        socket.off("connect", onUpdate);
        socket.off("rooms-updated", onUpdate);
      };
    }, [loadRooms]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRooms();
    setRefreshing(false);
  };

  const renderRoom = ({ item }: { item: ChatRoomSummary }) => (
    <TouchableOpacity
      style={styles.room}
      onPress={() =>
        navigation.navigate("AdminChatRoom", {
          roomId: item._id,
          customerName: item.customerId?.name || "Customer",
        })
      }
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{(item.customerId?.name || "?").charAt(0).toUpperCase()}</Text>
      </View>
      <View style={styles.roomBody}>
        <View style={styles.roomRow}>
          <Text style={styles.name} numberOfLines={1}>
            {item.customerId?.name || "Unknown Customer"}
          </Text>
          <Text style={styles.time}>{formatTime(item.lastMessageAt)}</Text>
        </View>
        <View style={styles.roomRow}>
          <Text style={styles.preview} numberOfLines={1}>
            {item.lastMessagePreview || item.customerId?.email || ""}
          </Text>
          {item.unreadCountAdmin > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{item.unreadCountAdmin > 99 ? "99+" : item.unreadCountAdmin}</Text>
            </View>
          )}
        </View>
        {!!item.adminId?.name && <Text style={styles.lastReply}>Last reply: {item.adminId.name}</Text>}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Chats</Text>
        <View style={styles.tabs}>
          {(["open", "closed"] as const).map((value) => (
            <TouchableOpacity
              key={value}
              onPress={() => {
                setLoading(true);
                setFilter(value);
              }}
              style={[styles.tab, filter === value && styles.tabActive]}
            >
              <Text style={[styles.tabText, filter === value && styles.tabTextActive]}>
                {value === "open" ? "Open" : "Closed"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <ActivityIndicator style={styles.loader} size="large" color="#1a1a1a" />
      ) : (
        <FlatList
          data={rooms}
          keyExtractor={(item) => item._id}
          renderItem={renderRoom}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={rooms.length === 0 ? styles.emptyList : undefined}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MessageCircle size={40} color="#ccc" />
              <Text style={styles.emptyText}>
                {error || (filter === "open" ? "No open conversations" : "No closed conversations")}
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  title: { fontSize: 28, fontWeight: "700", color: "#1a1a1a", marginBottom: 12 },
  tabs: { flexDirection: "row", backgroundColor: "#f3f4f6", borderRadius: 10, padding: 3 },
  tab: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 8 },
  tabActive: { backgroundColor: "#fff" },
  tabText: { color: "#6b7280", fontWeight: "500" },
  tabTextActive: { color: "#1a1a1a" },
  loader: { marginTop: 40 },
  room: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 18 },
  roomBody: { flex: 1, gap: 2 },
  roomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  name: { flex: 1, fontSize: 16, fontWeight: "600", color: "#1a1a1a" },
  time: { fontSize: 12, color: "#9ca3af" },
  preview: { flex: 1, fontSize: 14, color: "#6b7280" },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
  },
  badgeText: { color: "#fff", fontSize: 12, fontWeight: "700" },
  lastReply: { fontSize: 11, color: "#9ca3af" },
  emptyList: { flexGrow: 1 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12, paddingTop: 80 },
  emptyText: { color: "#9ca3af", fontSize: 15 },
});

export default AdminChatRoomsScreen;
