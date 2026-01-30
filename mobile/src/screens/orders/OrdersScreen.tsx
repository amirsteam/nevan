/**
 * Orders Screen
 * Displays list of user's past orders
 */
import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Package, ChevronRight, Clock } from "lucide-react-native";
import { useGetMyOrdersQuery } from "../../store/api";
import type { OrdersScreenProps } from "../../navigation/types";
import type { IOrder } from "@shared/types";

const getStatusColor = (status: string): string => {
  const colors: Record<string, string> = {
    pending: "#FFA500",
    processing: "#2196F3",
    shipped: "#9C27B0",
    delivered: "#4CAF50",
    cancelled: "#F44336",
  };
  return colors[status] || "#666";
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const OrdersScreen: React.FC<OrdersScreenProps> = ({ navigation }) => {
  const { data, isLoading, isFetching, refetch, isError, error } =
    useGetMyOrdersQuery();

  const orders = data?.orders || [];

  const renderOrder = ({ item }: { item: IOrder }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => navigation.navigate("OrderDetail", { orderId: item._id })}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderIconContainer}>
          <Package size={24} color="#666" />
        </View>
        <View style={styles.orderInfo}>
          <Text style={styles.orderNumber}>
            Order #{item.orderNumber || item._id.slice(-8).toUpperCase()}
          </Text>
          <View style={styles.dateRow}>
            <Clock size={14} color="#999" />
            <Text style={styles.orderDate}>
              {formatDate(item.createdAt as unknown as string)}
            </Text>
          </View>
        </View>
        <ChevronRight size={20} color="#ccc" />
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Items:</Text>
          <Text style={styles.detailValue}>{item.items?.length || 0}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Total:</Text>
          <Text style={styles.detailValue}>
            Rs. {(item.total ?? item.pricing?.total ?? 0).toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.orderFooter}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor:
                getStatusColor(item.status || item.orderStatus || "pending") +
                "20",
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              {
                color: getStatusColor(
                  item.status || item.orderStatus || "pending",
                ),
              },
            ]}
          >
            {(item.status || item.orderStatus || "pending")
              .charAt(0)
              .toUpperCase() +
              (item.status || item.orderStatus || "pending").slice(1)}
          </Text>
        </View>
        <View
          style={[
            styles.paymentBadge,
            {
              backgroundColor:
                (item.payment?.status || item.paymentStatus) === "paid"
                  ? "#4CAF5020"
                  : "#FFA50020",
            },
          ]}
        >
          <Text
            style={[
              styles.paymentText,
              {
                color:
                  (item.payment?.status || item.paymentStatus) === "paid"
                    ? "#4CAF50"
                    : "#FFA500",
              },
            ]}
          >
            {(item.payment?.status || item.paymentStatus) === "paid"
              ? "Paid"
              : "Pending"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load orders</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <FlatList
        data={orders}
        keyExtractor={(item) => item._id}
        renderItem={renderOrder}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Package size={64} color="#ddd" />
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptyText}>
              Your order history will appear here
            </Text>
            <TouchableOpacity
              style={styles.shopButton}
              onPress={() => navigation.navigate("HomeTab" as never)}
            >
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  orderCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  orderIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  orderDate: {
    fontSize: 13,
    color: "#999",
  },
  orderDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F0F0F0",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  detailLabel: {
    fontSize: 14,
    color: "#666",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  orderFooter: {
    flexDirection: "row",
    marginTop: 12,
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
  },
  paymentBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  paymentText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 24,
  },
  shopButton: {
    backgroundColor: "#000",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  shopButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  errorText: {
    fontSize: 16,
    color: "#666",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#000",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

export default OrdersScreen;
