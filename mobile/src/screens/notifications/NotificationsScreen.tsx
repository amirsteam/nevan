/**
 * Notifications Screen
 * In-app notification center showing order updates, promotions, chat messages, etc.
 */
import React, { useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  ListRenderItem,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Package,
  MessageCircle,
  Tag,
  Bell,
  ShoppingBag,
  Trash2,
  CheckCheck,
} from "lucide-react-native";
import {
  useGetNotificationsQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
} from "../../store/api";
import type { INotification } from "../../store/api";
import type { NotificationsScreenProps } from "../../navigation/types";

const typeConfig: Record<
  string,
  { icon: React.ReactNode; color: string; bgColor: string }
> = {
  order_update: {
    icon: <Package size={20} color="#4F46E5" />,
    color: "#4F46E5",
    bgColor: "#EEF2FF",
  },
  chat_message: {
    icon: <MessageCircle size={20} color="#059669" />,
    color: "#059669",
    bgColor: "#ECFDF5",
  },
  promotion: {
    icon: <Tag size={20} color="#D97706" />,
    color: "#D97706",
    bgColor: "#FFFBEB",
  },
  back_in_stock: {
    icon: <ShoppingBag size={20} color="#DC2626" />,
    color: "#DC2626",
    bgColor: "#FEF2F2",
  },
  general: {
    icon: <Bell size={20} color="#6B7280" />,
    color: "#6B7280",
    bgColor: "#F3F4F6",
  },
};

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

const NotificationsScreen: React.FC<NotificationsScreenProps> = ({
  navigation,
}) => {
  const insets = useSafeAreaInsets();
  const {
    data,
    isLoading,
    isFetching,
    refetch,
  } = useGetNotificationsQuery({ page: 1, limit: 50 });

  const [markAsRead] = useMarkAsReadMutation();
  const [markAllAsRead] = useMarkAllAsReadMutation();
  const [deleteNotification] = useDeleteNotificationMutation();

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const handlePress = useCallback(
    async (item: INotification) => {
      if (!item.isRead) {
        markAsRead(item._id);
      }

      // Navigate based on notification type
      switch (item.type) {
        case "order_update":
          if (item.data?.orderId) {
            navigation.navigate("OrderDetail", {
              orderId: item.data.orderId as string,
            });
          }
          break;
        case "chat_message":
          navigation.navigate("Chat");
          break;
        case "back_in_stock":
          if (item.data?.productSlug) {
            // Navigate to home tab then product detail
            (navigation as any).navigate("App", {
              screen: "Main",
              params: {
                screen: "HomeTab",
                params: {
                  screen: "ProductDetail",
                  params: { slug: item.data.productSlug as string },
                },
              },
            });
          }
          break;
        default:
          break;
      }
    },
    [navigation, markAsRead],
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteNotification(id);
    },
    [deleteNotification],
  );

  const renderNotification: ListRenderItem<INotification> = useCallback(
    ({ item }) => {
      const config = typeConfig[item.type] || typeConfig.general;

      return (
        <TouchableOpacity
          style={[
            styles.notificationItem,
            !item.isRead && styles.unreadItem,
          ]}
          onPress={() => handlePress(item)}
          activeOpacity={0.7}
        >
          <View
            style={[styles.iconContainer, { backgroundColor: config.bgColor }]}
          >
            {config.icon}
          </View>
          <View style={styles.contentContainer}>
            <Text
              style={[styles.title, !item.isRead && styles.unreadText]}
              numberOfLines={1}
            >
              {item.title}
            </Text>
            <Text style={styles.body} numberOfLines={2}>
              {item.body}
            </Text>
            <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
          </View>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={() => handleDelete(item._id)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Trash2 size={16} color="#ccc" />
          </TouchableOpacity>
          {!item.isRead && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      );
    },
    [handlePress, handleDelete],
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Mark all read button */}
      {unreadCount > 0 && (
        <TouchableOpacity
          style={styles.markAllBtn}
          onPress={() => markAllAsRead()}
        >
          <CheckCheck size={16} color="#4F46E5" />
          <Text style={styles.markAllText}>
            Mark all as read ({unreadCount})
          </Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item._id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + 20 },
          notifications.length === 0 && styles.emptyListContent,
        ]}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Bell size={48} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
              We'll notify you about order updates, promotions, and more
            </Text>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCFCFC",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  markAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    backgroundColor: "#EEF2FF",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderRadius: 10,
    gap: 6,
  },
  markAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4F46E5",
  },
  listContent: {
    paddingTop: 8,
  },
  emptyListContent: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginHorizontal: 12,
    marginBottom: 2,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  unreadItem: {
    backgroundColor: "#FAFBFF",
  },
  iconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contentContainer: {
    flex: 1,
    marginRight: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: "500",
    color: "#374151",
    marginBottom: 2,
  },
  unreadText: {
    fontWeight: "700",
    color: "#111827",
  },
  body: {
    fontSize: 13,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 4,
  },
  time: {
    fontSize: 11,
    color: "#9CA3AF",
  },
  deleteBtn: {
    padding: 6,
  },
  unreadDot: {
    position: "absolute",
    top: 18,
    left: 12,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#4F46E5",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
    marginTop: 16,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
  },
});

export default NotificationsScreen;
