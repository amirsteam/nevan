/**
 * OrderStatusBadge Component
 * Displays order status with appropriate color coding
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { OrderStatus } from "@shared/types";

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: "small" | "medium";
}

const statusConfig: Record<
  OrderStatus,
  { label: string; color: string; backgroundColor: string }
> = {
  pending: {
    label: "Pending",
    color: "#B45309",
    backgroundColor: "#FEF3C7",
  },
  confirmed: {
    label: "Confirmed",
    color: "#1D4ED8",
    backgroundColor: "#DBEAFE",
  },
  processing: {
    label: "Processing",
    color: "#7C3AED",
    backgroundColor: "#EDE9FE",
  },
  shipped: {
    label: "Shipped",
    color: "#0891B2",
    backgroundColor: "#CFFAFE",
  },
  delivered: {
    label: "Delivered",
    color: "#059669",
    backgroundColor: "#D1FAE5",
  },
  cancelled: {
    label: "Cancelled",
    color: "#DC2626",
    backgroundColor: "#FEE2E2",
  },
};

const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  size = "medium",
}) => {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: config.backgroundColor },
        size === "small" && styles.badgeSmall,
      ]}
    >
      <Text
        style={[
          styles.text,
          { color: config.color },
          size === "small" && styles.textSmall,
        ]}
      >
        {config.label}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  text: {
    fontSize: 13,
    fontWeight: "600",
  },
  textSmall: {
    fontSize: 11,
  },
});

export default OrderStatusBadge;
