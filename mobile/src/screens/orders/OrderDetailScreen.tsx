/**
 * Order Detail Screen
 * Displays detailed information about a single order
 */
import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Package,
  MapPin,
  CreditCard,
  Clock,
  Phone,
  User,
  X,
} from "lucide-react-native";
import { useGetOrderQuery, useCancelOrderMutation } from "../../store/api";
import type { OrderDetailScreenProps } from "../../navigation/types";

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
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const OrderDetailScreen: React.FC<OrderDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { orderId } = route.params;
  const {
    data: order,
    isLoading,
    isFetching,
    refetch,
    isError,
  } = useGetOrderQuery(orderId);

  const [cancelOrder, { isLoading: isCancelling }] = useCancelOrderMutation();

  const handleCancelOrder = (): void => {
    Alert.alert("Cancel Order", "Are you sure you want to cancel this order?", [
      { text: "No", style: "cancel" },
      {
        text: "Yes, Cancel",
        style: "destructive",
        onPress: async () => {
          try {
            await cancelOrder({ orderId }).unwrap();
            Alert.alert("Success", "Order cancelled successfully");
            refetch();
          } catch (error) {
            Alert.alert("Error", "Failed to cancel order");
          }
        },
      },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (isError || !order) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Failed to load order details</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const canCancel = ["pending", "processing"].includes(order.status);

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
      >
        {/* Order Status Header */}
        <View style={styles.statusHeader}>
          <View
            style={[
              styles.statusIconContainer,
              { backgroundColor: getStatusColor(order.status) + "20" },
            ]}
          >
            <Package size={32} color={getStatusColor(order.status)} />
          </View>
          <Text style={styles.statusTitle}>
            {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
          </Text>
          <Text style={styles.orderNumber}>
            Order #{order.orderNumber || order._id.slice(-8).toUpperCase()}
          </Text>
          <Text style={styles.orderDate}>
            {formatDate(order.createdAt as unknown as string)}
          </Text>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items</Text>
          {order.items?.map((item, index) => (
            <View key={index} style={styles.itemCard}>
              <Image
                source={{
                  uri:
                    item.image ||
                    (item.product as any)?.images?.[0]?.url ||
                    "https://via.placeholder.com/80",
                }}
                style={styles.itemImage}
              />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName} numberOfLines={2}>
                  {item.name || (item.product as any)?.name}
                </Text>
                {item.variantDetails && (
                  <Text style={styles.itemVariant}>
                    {item.variantDetails.size} / {item.variantDetails.color}
                  </Text>
                )}
                <View style={styles.itemPriceRow}>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  <Text style={styles.itemPrice}>
                    Rs. {item.price?.toFixed(2)}
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* Shipping Address */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Address</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <User size={18} color="#666" />
              <Text style={styles.infoText}>{order.shippingAddress?.name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Phone size={18} color="#666" />
              <Text style={styles.infoText}>
                {order.shippingAddress?.phone}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <MapPin size={18} color="#666" />
              <Text style={styles.infoText}>
                {order.shippingAddress?.street}, {order.shippingAddress?.city}
                {"\n"}
                {order.shippingAddress?.district}, Province{" "}
                {order.shippingAddress?.province}
              </Text>
            </View>
          </View>
        </View>

        {/* Payment Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <CreditCard size={18} color="#666" />
              <Text style={styles.infoText}>
                {order.payment?.method?.toUpperCase() || "N/A"}
              </Text>
              <View
                style={[
                  styles.paymentBadge,
                  {
                    backgroundColor:
                      order.payment?.status === "paid"
                        ? "#4CAF5020"
                        : "#FFA50020",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.paymentBadgeText,
                    {
                      color:
                        order.payment?.status === "paid"
                          ? "#4CAF50"
                          : "#FFA500",
                    },
                  ]}
                >
                  {order.payment?.status === "paid" ? "Paid" : "Pending"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>
                Rs. {order.subtotal?.toFixed(2)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Shipping</Text>
              <Text style={styles.summaryValue}>
                Rs. {order.shippingCost?.toFixed(2) || "0.00"}
              </Text>
            </View>
            {order.discount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Discount</Text>
                <Text style={[styles.summaryValue, { color: "#4CAF50" }]}>
                  -Rs. {order.discount?.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>
                Rs. {order.total?.toFixed(2)}
              </Text>
            </View>
          </View>
        </View>

        {/* Status History */}
        {order.statusHistory && order.statusHistory.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Timeline</Text>
            <View style={styles.timelineCard}>
              {order.statusHistory.map((history, index) => (
                <View key={index} style={styles.timelineItem}>
                  <View style={styles.timelineDot} />
                  {index < order.statusHistory!.length - 1 && (
                    <View style={styles.timelineLine} />
                  )}
                  <View style={styles.timelineContent}>
                    <Text style={styles.timelineStatus}>
                      {history.status.charAt(0).toUpperCase() +
                        history.status.slice(1)}
                    </Text>
                    <Text style={styles.timelineDate}>
                      {formatDate(history.timestamp as unknown as string)}
                    </Text>
                    {history.note && (
                      <Text style={styles.timelineNote}>{history.note}</Text>
                    )}
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Cancel Button */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelOrder}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator color="#F44336" />
            ) : (
              <>
                <X size={20} color="#F44336" />
                <Text style={styles.cancelButtonText}>Cancel Order</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
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
  scrollContent: {
    padding: 16,
  },
  statusHeader: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 24,
    alignItems: "center",
    marginBottom: 16,
  },
  statusIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  statusTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 4,
  },
  orderNumber: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  orderDate: {
    fontSize: 13,
    color: "#999",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    marginLeft: 4,
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    flexDirection: "row",
    marginBottom: 8,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  itemVariant: {
    fontSize: 12,
    color: "#666",
    marginBottom: 4,
  },
  itemPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemQuantity: {
    fontSize: 13,
    color: "#666",
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  infoCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: "#333",
    lineHeight: 20,
  },
  paymentBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  summaryCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: "#666",
  },
  summaryValue: {
    fontSize: 14,
    color: "#333",
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#333",
  },
  timelineCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
  },
  timelineItem: {
    flexDirection: "row",
    position: "relative",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#000",
    marginRight: 12,
    marginTop: 4,
  },
  timelineLine: {
    position: "absolute",
    left: 5,
    top: 16,
    bottom: 0,
    width: 2,
    backgroundColor: "#E0E0E0",
  },
  timelineContent: {
    flex: 1,
    paddingBottom: 16,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  timelineDate: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  timelineNote: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
    fontStyle: "italic",
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "#F44336",
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F44336",
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

export default OrderDetailScreen;
