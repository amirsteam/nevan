import React, { useCallback } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Heart } from "lucide-react-native";
import type { IProduct } from "@shared/types";
import { useAppSelector } from "../store/hooks";
import {
  useGetWishlistQuery,
  useAddToWishlistMutation,
  useRemoveFromWishlistMutation,
} from "../store/api";

interface ProductCardProps {
  product: IProduct;
  onPress: () => void;
  showWishlist?: boolean;
}

const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onPress,
  showWishlist = true,
}) => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { data: wishlist } = useGetWishlistQuery(undefined, {
    skip: !isAuthenticated || !showWishlist,
  });

  const [addToWishlist, { isLoading: isAdding }] = useAddToWishlistMutation();
  const [removeFromWishlist, { isLoading: isRemoving }] =
    useRemoveFromWishlistMutation();

  const isInWishlist = wishlist?.some((item) => item._id === product._id);
  const isWishlistLoading = isAdding || isRemoving;

  const handleWishlistPress = useCallback(async () => {
    if (!isAuthenticated) {
      Alert.alert(
        "Sign In Required",
        "Please sign in to save items to your wishlist.",
      );
      return;
    }

    try {
      if (isInWishlist) {
        await removeFromWishlist(product._id).unwrap();
      } else {
        await addToWishlist(product._id).unwrap();
      }
    } catch (error) {
      Alert.alert("Error", "Failed to update wishlist");
    }
  }, [
    isAuthenticated,
    isInWishlist,
    product._id,
    addToWishlist,
    removeFromWishlist,
  ]);

  // Helper to handle image source
  const imageSource =
    product.images && product.images.length > 0
      ? {
          uri:
            product.images[0].url || (product.images[0] as unknown as string),
        }
      : { uri: "https://via.placeholder.com/150" };

  // Calculate discount if available
  const hasDiscount =
    product.variants?.[0]?.comparePrice &&
    product.variants[0].comparePrice > product.price;
  const discountPercent = hasDiscount
    ? Math.round(
        ((product.variants![0].comparePrice! - product.price) /
          product.variants![0].comparePrice!) *
          100,
      )
    : 0;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
      <View style={styles.imageContainer}>
        <Image source={imageSource} style={styles.image} resizeMode="cover" />
        {hasDiscount && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discountPercent}%</Text>
          </View>
        )}
        {showWishlist && (
          <TouchableOpacity
            style={[
              styles.wishlistButton,
              isInWishlist && styles.wishlistButtonActive,
            ]}
            onPress={handleWishlistPress}
            disabled={isWishlistLoading}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Heart
              size={18}
              color={isInWishlist ? "#fff" : "#666"}
              fill={isInWishlist ? "#F44336" : "none"}
              strokeWidth={isInWishlist ? 0 : 2}
            />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.details}>
        <Text style={styles.name} numberOfLines={2}>
          {product.name}
        </Text>
        <View style={styles.priceRow}>
          <Text style={styles.price}>Rs. {product.price}</Text>
          {hasDiscount && (
            <Text style={styles.comparePrice}>
              Rs. {product.variants![0].comparePrice}
            </Text>
          )}
        </View>
        {product.stock !== undefined && product.stock <= 0 && (
          <Text style={styles.outOfStock}>Out of Stock</Text>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    width: "48%",
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    width: "100%",
    height: 160,
    backgroundColor: "#FAFAFA",
  },
  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "#F44336",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  discountText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },
  wishlistButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "#fff",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  wishlistButtonActive: {
    backgroundColor: "#F44336",
  },
  details: {
    padding: 12,
  },
  name: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4A4A4A",
    marginBottom: 6,
    lineHeight: 20,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  price: {
    fontSize: 15,
    color: "#FF9999",
    fontWeight: "700",
  },
  comparePrice: {
    fontSize: 12,
    color: "#999",
    textDecorationLine: "line-through",
  },
  outOfStock: {
    fontSize: 11,
    color: "#F44336",
    fontWeight: "500",
    marginTop: 4,
  },
});

export default ProductCard;
