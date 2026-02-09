/**
 * NotificationBell Component
 * Bell icon with unread badge counter for the header.
 * Tapping navigates to the Notifications screen.
 */
import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Bell } from "lucide-react-native";
import { useGetUnreadCountQuery } from "../store/api";
import { useAppSelector } from "../store/hooks";

interface NotificationBellProps {
  onPress: () => void;
  color?: string;
  size?: number;
}

const NotificationBell: React.FC<NotificationBellProps> = ({
  onPress,
  color = "#333",
  size = 24,
}) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // Only poll when logged in — refetch every 30s
  const { data: unreadCount = 0 } = useGetUnreadCountQuery(undefined, {
    skip: !isAuthenticated,
    pollingInterval: 30_000,
  });

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      activeOpacity={0.7}
    >
      <Bell size={size} color={color} />
      {unreadCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 4,
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 0,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
    lineHeight: 12,
  },
});

export default NotificationBell;
