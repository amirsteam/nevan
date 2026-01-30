/**
 * AdminProductCard Component
 * Displays product summary for admin list views
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image } from "react-native";
import { ChevronRight, Package, Eye, EyeOff } from "lucide-react-native";
import type { IProduct } from "@shared/types";

interface AdminProductCardProps {
  product: IProduct;
  onPress: () => void;
}

const formatCurrency = (amount: number): string => {
  return `Rs. ${amount.toLocaleString()}`;
};

const AdminProductCard: React.FC<AdminProductCardProps> = ({
  product,
  onPress,
}) => {
  const imageUrl = product.images?.[0]?.url;
  const categoryName =
    typeof product.category === "object"
      ? product.category.name
      : "Uncategorized";
  const isActive = (product as any).isActive !== false;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.imageContainer}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.placeholderImage}>
            <Package size={24} color="#ccc" />
          </View>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {product.name}
          </Text>
          {isActive ? (
            <Eye size={16} color="#059669" />
          ) : (
            <EyeOff size={16} color="#DC2626" />
          )}
        </View>

        <Text style={styles.category}>{categoryName}</Text>

        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{formatCurrency(product.price)}</Text>
            {product.comparePrice && product.comparePrice > product.price && (
              <Text style={styles.comparePrice}>
                {formatCurrency(product.comparePrice)}
              </Text>
            )}
          </View>

          <View style={styles.stockContainer}>
            <Text
              style={[
                styles.stock,
                product.stock <= 5 ? styles.lowStock : styles.inStock,
              ]}
            >
              {product.stock} in stock
            </Text>
          </View>
        </View>

        {product.variants && product.variants.length > 0 && (
          <Text style={styles.variants}>
            {product.variants.length} variant
            {product.variants.length > 1 ? "s" : ""}
          </Text>
        )}
      </View>

      <ChevronRight size={20} color="#999" style={styles.chevron} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  imageContainer: {
    width: 70,
    height: 70,
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#f5f5f5",
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
    marginLeft: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  name: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
    marginRight: 8,
  },
  category: {
    fontSize: 12,
    color: "#888",
    marginBottom: 8,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  price: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  comparePrice: {
    fontSize: 12,
    color: "#999",
    textDecorationLine: "line-through",
  },
  stockContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  stock: {
    fontSize: 12,
    fontWeight: "500",
  },
  inStock: {
    color: "#059669",
  },
  lowStock: {
    color: "#DC2626",
  },
  variants: {
    fontSize: 11,
    color: "#666",
    marginTop: 4,
  },
  chevron: {
    marginLeft: 8,
  },
});

export default AdminProductCard;
