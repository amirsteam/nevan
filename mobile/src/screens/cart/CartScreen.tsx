import React, { useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Trash2, Plus, Minus } from "lucide-react-native";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import {
  fetchCart,
  updateCartItem,
  removeFromCart,
} from "../../store/cartSlice";
import type { CartScreenProps } from "../../navigation/types";
import type { ICartItem } from "@shared/types";

// Memoized CartItem component to prevent unnecessary re-renders
interface CartItemProps {
  item: ICartItem;
  onUpdateQuantity: (
    itemId: string,
    currentQuantity: number,
    change: number,
  ) => void;
  onRemove: (itemId: string) => void;
}

const CartItem: React.FC<CartItemProps> = React.memo(
  ({ item, onUpdateQuantity, onRemove }) => {
    // Use variant image if available, otherwise use product's first image
    const variantImageUrl = item.variant?.image;
    const productImageUrl =
      item.product.images?.[0]?.url ||
      (item.product.images?.[0] as unknown as string);

    const imageSource = variantImageUrl
      ? { uri: variantImageUrl }
      : productImageUrl
        ? { uri: productImageUrl }
        : { uri: "https://via.placeholder.com/100" };

    // Use currentPrice (includes variant price) or fallback to product price
    const displayPrice = item.currentPrice ?? item.product.price;

    return (
      <View style={styles.cartItem}>
        <Image source={imageSource} style={styles.image} />
        <View style={styles.details}>
          <Text style={styles.name} numberOfLines={2}>
            {item.product.name}
          </Text>
          {item.variant && (
            <Text style={styles.variantInfo}>
              {item.variant.size} - {item.variant.color}
            </Text>
          )}
          <Text style={styles.price}>Rs. {displayPrice}</Text>

          <View style={styles.actions}>
            <View style={styles.quantityControl}>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => onUpdateQuantity(item._id, item.quantity, -1)}
              >
                <Minus size={16} color="#333" />
              </TouchableOpacity>
              <Text style={styles.quantity}>{item.quantity}</Text>
              <TouchableOpacity
                style={styles.qtyButton}
                onPress={() => onUpdateQuantity(item._id, item.quantity, 1)}
              >
                <Plus size={16} color="#333" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => onRemove(item._id)}>
              <Trash2 size={20} color="red" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  },
);

const CartScreen: React.FC<CartScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { items, subtotal, itemCount, loading } = useAppSelector(
    (state) => state.cart,
  );

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const handleUpdateQuantity = useCallback(
    (itemId: string, currentQuantity: number, change: number): void => {
      const newQuantity = currentQuantity + change;
      if (newQuantity < 1) return;
      dispatch(updateCartItem({ itemId, quantity: newQuantity }));
    },
    [dispatch],
  );

  const handleRemove = useCallback(
    (itemId: string): void => {
      Alert.alert("Remove Item", "Are you sure you want to remove this item?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => dispatch(removeFromCart(itemId)),
        },
      ]);
    },
    [dispatch],
  );

  const renderItem: ListRenderItem<ICartItem> = useCallback(
    ({ item }) => (
      <CartItem
        item={item}
        onUpdateQuantity={handleUpdateQuantity}
        onRemove={handleRemove}
      />
    ),
    [handleUpdateQuantity, handleRemove],
  );

  if (loading && items.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (items.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => navigation.navigate("HomeTab" as never)}
          >
            <Text style={styles.browseButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Shopping Cart ({itemCount})</Text>
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
      />
      <View style={styles.allowance}>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total:</Text>
          <Text style={styles.totalAmount}>Rs. {subtotal}</Text>
        </View>
        <TouchableOpacity
          style={styles.checkoutButton}
          onPress={() => navigation.getParent()?.navigate("Checkout")}
        >
          <Text style={styles.checkoutButtonText}>Proceed to Checkout</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FCFCFC",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    padding: 20,
    backgroundColor: "#fff",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#4A4A4A",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 18,
    marginBottom: 20,
    color: "#666",
    fontWeight: "500",
  },
  browseButton: {
    backgroundColor: "#FF9999",
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 25,
    shadowColor: "#FF9999",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  browseButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
  list: {
    padding: 20,
  },
  cartItem: {
    flexDirection: "row",
    marginBottom: 16,
    backgroundColor: "#fff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0F0F0",
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  image: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#FAFAFA",
  },
  details: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "space-between",
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
    lineHeight: 22,
  },
  variantInfo: {
    fontSize: 12,
    color: "#666",
    marginBottom: 2,
  },
  price: {
    fontSize: 15,
    color: "#FF9999",
    fontWeight: "700",
    marginTop: 4,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  quantityControl: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EFEFEF",
    borderRadius: 20,
    backgroundColor: "#FAFAFA",
  },
  qtyButton: {
    padding: 8,
  },
  quantity: {
    paddingHorizontal: 16,
    fontWeight: "600",
    color: "#333",
  },
  allowance: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FCFCFC",
    paddingBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    alignItems: "center",
    paddingHorizontal: 4,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#555",
  },
  totalAmount: {
    fontSize: 26,
    fontWeight: "700",
    color: "#4A4A4A",
  },
  checkoutButton: {
    backgroundColor: "#FF9999",
    paddingVertical: 18,
    borderRadius: 30,
    alignItems: "center",
    shadowColor: "#FF9999",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutButtonText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});

export default CartScreen;
