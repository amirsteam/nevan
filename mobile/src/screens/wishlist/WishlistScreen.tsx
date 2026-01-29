/**
 * Wishlist Screen
 * Displays user's saved/favorite products
 */
import React from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  RefreshControl,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Heart, ShoppingCart, Trash2 } from "lucide-react-native";
import {
  useGetWishlistQuery,
  useRemoveFromWishlistMutation,
  useAddToCartMutation,
} from "../../store/api";
import { useAppSelector } from "../../store/hooks";
import type { WishlistScreenProps } from "../../navigation/types";
import type { IProduct } from "@shared/types";

const WishlistScreen: React.FC<WishlistScreenProps> = ({ navigation }) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const {
    data: wishlist,
    isLoading,
    isFetching,
    refetch,
    isError,
  } = useGetWishlistQuery(undefined, {
    skip: !isAuthenticated,
  });

  const [removeFromWishlist, { isLoading: isRemoving }] =
    useRemoveFromWishlistMutation();
  const [addToCart] = useAddToCartMutation();

  const handleRemove = async (productId: string, productName: string) => {
    Alert.alert(
      "Remove from Wishlist",
      `Remove ${productName} from your wishlist?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await removeFromWishlist(productId).unwrap();
            } catch (error) {
              Alert.alert("Error", "Failed to remove item from wishlist");
            }
          },
        },
      ],
    );
  };

  const handleAddToCart = async (product: IProduct) => {
    try {
      await addToCart({
        productId: product._id,
        quantity: 1,
      }).unwrap();
      Alert.alert("Success", `${product.name} added to cart`);
    } catch (error) {
      Alert.alert("Error", "Failed to add item to cart");
    }
  };

  const handleProductPress = (slug: string) => {
    navigation.navigate("HomeTab", {
      screen: "ProductDetail",
      params: { slug },
    });
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Heart size={48} color="#999" />
          </View>
          <Text style={styles.emptyTitle}>Sign in to view your wishlist</Text>
          <Text style={styles.emptySubtitle}>
            Save your favorite items and find them easily later
          </Text>
          <TouchableOpacity
            style={styles.signInButton}
            onPress={() => navigation.navigate("Auth", { screen: "Login" })}
          >
            <Text style={styles.signInButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (isError) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.errorText}>Failed to load wishlist</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!wishlist || wishlist.length === 0) {
    return (
      <SafeAreaView
        style={styles.container}
        edges={["bottom", "left", "right"]}
      >
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Heart size={48} color="#999" />
          </View>
          <Text style={styles.emptyTitle}>Your wishlist is empty</Text>
          <Text style={styles.emptySubtitle}>
            Explore products and tap the heart icon to save items you love
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() =>
              navigation.navigate("HomeTab", { screen: "HomeScreen" })
            }
          >
            <Text style={styles.browseButtonText}>Browse Products</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderItem = ({ item }: { item: IProduct }) => {
    const imageUrl = item.images?.[0]?.url || "https://via.placeholder.com/100";
    const hasDiscount =
      item.variants?.[0]?.comparePrice &&
      item.variants[0].comparePrice > item.price;
    const discountPercent = hasDiscount
      ? Math.round(
          ((item.variants![0].comparePrice! - item.price) /
            item.variants![0].comparePrice!) *
            100,
        )
      : 0;

    return (
      <TouchableOpacity
        style={styles.itemCard}
        onPress={() => handleProductPress(item.slug)}
        activeOpacity={0.8}
      >
        <Image source={{ uri: imageUrl }} style={styles.itemImage} />
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPercent}%</Text>
          </View>
        )}
        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={2}>
            {item.name}
          </Text>
          <View style={styles.priceRow}>
            <Text style={styles.itemPrice}>Rs. {item.price?.toFixed(2)}</Text>
            {hasDiscount && (
              <Text style={styles.comparePrice}>
                Rs. {item.variants![0].comparePrice?.toFixed(2)}
              </Text>
            )}
          </View>
          <Text
            style={[
              styles.stockStatus,
              { color: item.stock > 0 ? "#4CAF50" : "#F44336" },
            ]}
          >
            {item.stock > 0 ? "In Stock" : "Out of Stock"}
          </Text>
        </View>
        <View style={styles.itemActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleRemove(item._id, item.name)}
            disabled={isRemoving}
          >
            <Trash2 size={20} color="#F44336" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.cartButton,
              item.stock <= 0 && styles.cartButtonDisabled,
            ]}
            onPress={() => handleAddToCart(item)}
            disabled={item.stock <= 0}
          >
            <ShoppingCart size={18} color={item.stock > 0 ? "#fff" : "#999"} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <FlatList
        data={wishlist}
        renderItem={renderItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text style={styles.itemCount}>
            {wishlist.length} {wishlist.length === 1 ? "item" : "items"}
          </Text>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  listContent: {
    padding: 16,
  },
  itemCount: {
    fontSize: 14,
    color: "#666",
    marginBottom: 12,
  },
  itemCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    flexDirection: "row",
    padding: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  itemImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
  },
  discountBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: "#F44336",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  discountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
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
    marginBottom: 6,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  comparePrice: {
    fontSize: 12,
    color: "#999",
    textDecorationLine: "line-through",
  },
  stockStatus: {
    fontSize: 12,
    fontWeight: "500",
  },
  itemActions: {
    justifyContent: "space-between",
    alignItems: "center",
    paddingLeft: 8,
  },
  actionButton: {
    padding: 8,
  },
  cartButton: {
    backgroundColor: "#000",
    padding: 10,
    borderRadius: 20,
  },
  cartButtonDisabled: {
    backgroundColor: "#E0E0E0",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  },
  signInButton: {
    backgroundColor: "#000",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 8,
  },
  signInButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  browseButton: {
    backgroundColor: "#000",
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 8,
  },
  browseButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
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

export default WishlistScreen;
