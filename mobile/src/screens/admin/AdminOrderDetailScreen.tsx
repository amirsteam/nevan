/**
 * Admin Order Detail Screen
 * Shows order details with status update functionality
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  Package,
  CreditCard,
  Clock,
  CheckCircle,
} from "lucide-react-native";
import { OrderStatusBadge } from "../../components/admin";
import { adminAPI } from "../../api/admin";
import type { AdminOrderDetailScreenProps } from "../../navigation/types";
import type { IOrder, OrderStatus } from "@shared/types";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const formatCurrency = (amount: number | undefined | null): string => {
  if (amount == null) return "Rs. 0";
  return `Rs. ${amount.toLocaleString()}`;
};

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const AdminOrderDetailScreen: React.FC<AdminOrderDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { orderId } = route.params;
  const [order, setOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    try {
      setError(null);
      const data = await adminAPI.getOrderById(orderId);
      setOrder(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load order");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrder();
  };

  const handleStatusUpdate = async (newStatus: OrderStatus) => {
    if (!order) return;

    Alert.alert("Update Order Status", `Change status to "${newStatus}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Update",
        onPress: async () => {
          try {
            setUpdating(true);
            const updated = await adminAPI.updateOrderStatus(
              orderId,
              newStatus,
            );
            setOrder(updated);
            Alert.alert("Success", "Order status updated");
          } catch (err: any) {
            Alert.alert(
              "Error",
              err.response?.data?.message || "Failed to update status",
            );
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  const handleMarkCODCollected = async () => {
    if (!order) return;

    Alert.alert(
      "Mark COD as Collected",
      "Confirm that payment has been collected?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              setUpdating(true);
              await adminAPI.markCODCollected(orderId);
              // Refetch order to get updated data
              await fetchOrder();
              Alert.alert("Success", "Payment marked as collected");
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to update payment",
              );
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || "Order not found"}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrder}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const customerName =
    typeof order.user === "object" ? order.user.name : "Customer";
  const customerEmail =
    typeof order.user === "object" ? order.user.email : null;

  // Defensive fallbacks for nested/flat order structure
  const orderStatus = order.orderStatus || order.status || "pending";
  const paymentMethod = order.paymentMethod || order.payment?.method || "cod";
  const paymentStatus =
    order.paymentStatus || order.payment?.status || "pending";

  // Defensive fallbacks for pricing (can be nested or flat)
  const subtotal = order.subtotal ?? order.pricing?.subtotal ?? 0;
  const shippingCost = order.shippingCost ?? order.pricing?.shippingCost ?? 0;
  const total = order.total ?? order.pricing?.total ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.orderNumber}>#{order.orderNumber}</Text>
          <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>
        <OrderStatusBadge status={orderStatus} size="small" />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Customer Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <User size={18} color="#666" />
            <Text style={styles.sectionTitle}>Customer</Text>
          </View>
          <View style={styles.sectionContent}>
            <Text style={styles.customerName}>{customerName}</Text>
            {customerEmail && (
              <Text style={styles.customerEmail}>{customerEmail}</Text>
            )}
          </View>
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MapPin size={18} color="#666" />
            <Text style={styles.sectionTitle}>Shipping Address</Text>
          </View>
          <View style={styles.sectionContent}>
            <Text style={styles.addressName}>
              {order.shippingAddress.fullName}
            </Text>
            <Text style={styles.addressText}>
              {order.shippingAddress.street}
            </Text>
            <Text style={styles.addressText}>
              {order.shippingAddress.city}, {order.shippingAddress.state}
              {order.shippingAddress.postalCode &&
                ` - ${order.shippingAddress.postalCode}`}
            </Text>
            <View style={styles.phoneRow}>
              <Phone size={14} color="#888" />
              <Text style={styles.phoneText}>
                {order.shippingAddress.phone}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Package size={18} color="#666" />
            <Text style={styles.sectionTitle}>
              Items ({order.items.length})
            </Text>
          </View>
          <View style={styles.itemsList}>
            {order.items.map((item, index) => (
              <View key={index} style={styles.itemRow}>
                <View style={styles.itemImageContainer}>
                  {item.image ? (
                    <Image
                      source={{ uri: item.image }}
                      style={styles.itemImage}
                    />
                  ) : (
                    <View style={styles.itemImagePlaceholder}>
                      <Package size={16} color="#ccc" />
                    </View>
                  )}
                </View>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.name}
                  </Text>
                  {item.variant && (
                    <Text style={styles.itemVariant}>
                      {item.variant.size} / {item.variant.color}
                    </Text>
                  )}
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                </View>
                <Text style={styles.itemPrice}>
                  {formatCurrency((item.price || 0) * (item.quantity || 1))}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <CreditCard size={18} color="#666" />
            <Text style={styles.sectionTitle}>Payment</Text>
          </View>
          <View style={styles.sectionContent}>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Method</Text>
              <Text style={styles.paymentValue}>
                {paymentMethod.toUpperCase()}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Status</Text>
              <View
                style={[
                  styles.paymentStatusBadge,
                  paymentStatus === "paid"
                    ? styles.paidBadge
                    : styles.unpaidBadge,
                ]}
              >
                <Text
                  style={[
                    styles.paymentStatusText,
                    paymentStatus === "paid"
                      ? styles.paidText
                      : styles.unpaidText,
                  ]}
                >
                  {paymentStatus.toUpperCase()}
                </Text>
              </View>
            </View>
            <View style={styles.divider} />
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Subtotal</Text>
              <Text style={styles.paymentValue}>
                {formatCurrency(subtotal)}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.paymentLabel}>Shipping</Text>
              <Text style={styles.paymentValue}>
                {formatCurrency(shippingCost)}
              </Text>
            </View>
            <View style={styles.paymentRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(total)}</Text>
            </View>
          </View>
        </View>

        {/* COD Collection Button */}
        {paymentMethod === "cod" && paymentStatus !== "paid" && (
          <TouchableOpacity
            style={styles.codButton}
            onPress={handleMarkCODCollected}
            disabled={updating}
          >
            <CheckCircle size={20} color="#fff" />
            <Text style={styles.codButtonText}>Mark COD as Collected</Text>
          </TouchableOpacity>
        )}

        {/* Status Update Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Clock size={18} color="#666" />
            <Text style={styles.sectionTitle}>Update Status</Text>
          </View>
          <View style={styles.statusGrid}>
            {ORDER_STATUSES.map((status) => (
              <TouchableOpacity
                key={status}
                style={[
                  styles.statusButton,
                  orderStatus === status && styles.statusButtonActive,
                ]}
                onPress={() => handleStatusUpdate(status)}
                disabled={updating || orderStatus === status}
              >
                <Text
                  style={[
                    styles.statusButtonText,
                    orderStatus === status && styles.statusButtonTextActive,
                  ]}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Status History */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Clock size={18} color="#666" />
              <Text style={styles.sectionTitle}>Status History</Text>
            </View>
            <View style={styles.historyList}>
              {order.statusHistory.map((history, index) => {
                const historyStatus = history.status || "pending";
                return (
                  <View key={index} style={styles.historyItem}>
                    <View style={styles.historyDot} />
                    <View style={styles.historyContent}>
                      <Text style={styles.historyStatus}>
                        {historyStatus.charAt(0).toUpperCase() +
                          historyStatus.slice(1)}
                      </Text>
                      <Text style={styles.historyDate}>
                        {formatDate(
                          history.timestamp || history.changedAt || "",
                        )}
                      </Text>
                      {history.note && (
                        <Text style={styles.historyNote}>{history.note}</Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {updating && (
        <View style={styles.updatingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  headerCenter: {
    flex: 1,
    marginLeft: 16,
  },
  orderNumber: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  orderDate: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: "#DC2626",
    textAlign: "center",
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  sectionContent: {},
  customerName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  customerEmail: {
    fontSize: 14,
    color: "#666",
  },
  addressName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  addressText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
  },
  phoneText: {
    fontSize: 14,
    color: "#666",
  },
  itemsList: {},
  itemRow: {
    flexDirection: "row",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  itemImageContainer: {
    width: 50,
    height: 50,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  itemImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  itemImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  itemVariant: {
    fontSize: 12,
    color: "#888",
    marginBottom: 2,
  },
  itemQuantity: {
    fontSize: 12,
    color: "#666",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  paymentRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  paymentLabel: {
    fontSize: 14,
    color: "#666",
  },
  paymentValue: {
    fontSize: 14,
    color: "#1a1a1a",
    fontWeight: "500",
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  paidBadge: {
    backgroundColor: "#D1FAE5",
  },
  unpaidBadge: {
    backgroundColor: "#FEF3C7",
  },
  paymentStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  paidText: {
    color: "#059669",
  },
  unpaidText: {
    color: "#B45309",
  },
  divider: {
    height: 1,
    backgroundColor: "#f0f0f0",
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  codButton: {
    backgroundColor: "#059669",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 12,
  },
  codButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
  statusGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statusButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  statusButtonActive: {
    backgroundColor: "#1a1a1a",
    borderColor: "#1a1a1a",
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: "500",
    color: "#666",
  },
  statusButtonTextActive: {
    color: "#fff",
  },
  historyList: {
    marginLeft: 8,
  },
  historyItem: {
    flexDirection: "row",
    marginBottom: 16,
  },
  historyDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#1a1a1a",
    marginTop: 4,
    marginRight: 12,
  },
  historyContent: {
    flex: 1,
  },
  historyStatus: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  historyDate: {
    fontSize: 12,
    color: "#888",
  },
  historyNote: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  updatingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default AdminOrderDetailScreen;
