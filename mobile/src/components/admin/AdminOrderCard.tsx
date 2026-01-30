/**
 * AdminOrderCard Component
 * Displays order summary for admin list views
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { ChevronRight, Clock } from "lucide-react-native";
import OrderStatusBadge from "./OrderStatusBadge";
import type { IOrder } from "@shared/types";

interface AdminOrderCardProps {
  order: IOrder;
  onPress: () => void;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatCurrency = (amount: number): string => {
  return `Rs. ${amount.toLocaleString()}`;
};

const AdminOrderCard: React.FC<AdminOrderCardProps> = ({ order, onPress }) => {
  const customerName =
    typeof order.user === "object" ? order.user.name : "Customer";
  const itemCount = order.items?.length || 0;
  const orderStatus = order.orderStatus || (order as any).status || "pending";
  const paymentMethod = order.paymentMethod || "cod";
  const paymentStatus = order.paymentStatus || "pending";
  const total = order.total || 0;
  const shippingAddress = order.shippingAddress || { city: "", state: "" };

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <View style={styles.dateContainer}>
            <Clock size={12} color="#888" />
            <Text style={styles.date}>{formatDate(order.createdAt)}</Text>
          </View>
        </View>
        <OrderStatusBadge status={orderStatus} size="small" />
      </View>

      <View style={styles.body}>
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{customerName}</Text>
          <Text style={styles.itemCount}>
            {itemCount} item{itemCount !== 1 ? "s" : ""}
          </Text>
        </View>
        <View style={styles.priceContainer}>
          <Text style={styles.total}>{formatCurrency(total)}</Text>
          <View style={styles.paymentInfo}>
            <Text style={styles.paymentMethod}>
              {paymentMethod.toUpperCase()}
            </Text>
            <View
              style={[
                styles.paymentStatus,
                paymentStatus === "paid"
                  ? styles.paidStatus
                  : styles.pendingStatus,
              ]}
            >
              <Text
                style={[
                  styles.paymentStatusText,
                  paymentStatus === "paid"
                    ? styles.paidStatusText
                    : styles.pendingStatusText,
                ]}
              >
                {paymentStatus === "paid" ? "Paid" : "Unpaid"}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.address} numberOfLines={1}>
          {shippingAddress.city}
          {shippingAddress.city && shippingAddress.state ? ", " : ""}
          {shippingAddress.state}
        </Text>
        <ChevronRight size={20} color="#999" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  date: {
    fontSize: 12,
    color: "#888",
  },
  body: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  itemCount: {
    fontSize: 13,
    color: "#666",
  },
  priceContainer: {
    alignItems: "flex-end",
  },
  total: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  paymentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  paymentMethod: {
    fontSize: 11,
    color: "#888",
    fontWeight: "600",
  },
  paymentStatus: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  paidStatus: {
    backgroundColor: "#D1FAE5",
  },
  pendingStatus: {
    backgroundColor: "#FEF3C7",
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  paidStatusText: {
    color: "#059669",
  },
  pendingStatusText: {
    color: "#B45309",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  address: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
});

export default AdminOrderCard;
