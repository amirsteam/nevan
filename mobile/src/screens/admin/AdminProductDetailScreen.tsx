/**
 * Admin Product Detail Screen
 * View product details with actions
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
  Image,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Edit2,
  Trash2,
  Star,
  Package,
  Tag,
  Eye,
  EyeOff,
} from "lucide-react-native";
import { adminAPI } from "../../api/admin";
import type { AdminProductDetailScreenProps } from "../../navigation/types";
import type { IProduct } from "@shared/types";

const formatCurrency = (amount: number): string => {
  return `Rs. ${amount.toLocaleString()}`;
};

const AdminProductDetailScreen: React.FC<AdminProductDetailScreenProps> = ({
  navigation,
  route,
}) => {
  const { productId } = route.params;
  const [product, setProduct] = useState<IProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProduct = useCallback(async () => {
    try {
      setError(null);
      const data = await adminAPI.getProductById(productId);
      setProduct(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load product");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchProduct();
  }, [fetchProduct]);

  // Refresh when returning from edit
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      if (product) {
        fetchProduct();
      }
    });
    return unsubscribe;
  }, [navigation, fetchProduct, product]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProduct();
  };

  const handleEdit = () => {
    navigation.navigate("AdminProductEdit", { productId });
  };

  const handleDelete = () => {
    if (!product) return;

    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${product.name}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await adminAPI.deleteProduct(productId);
              Alert.alert("Success", "Product deleted");
              navigation.goBack();
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to delete product",
              );
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

  if (error || !product) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <ArrowLeft size={24} color="#1a1a1a" />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error || "Product not found"}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchProduct}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const categoryName =
    typeof product.category === "object"
      ? product.category.name
      : "Uncategorized";
  const primaryImage = product.images?.[0]?.url;
  const isActive = (product as any).isActive !== false;

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleEdit}>
            <Edit2 size={20} color="#1D4ED8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton} onPress={handleDelete}>
            <Trash2 size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Image Gallery */}
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={styles.imageGallery}
        >
          {product.images && product.images.length > 0 ? (
            product.images.map((img, index) => (
              <Image
                key={index}
                source={{ uri: img.url }}
                style={styles.productImage}
                resizeMode="cover"
              />
            ))
          ) : (
            <View style={[styles.productImage, styles.noImage]}>
              <Package size={48} color="#ddd" />
            </View>
          )}
        </ScrollView>

        {/* Status Badge */}
        <View style={styles.statusRow}>
          {isActive ? (
            <View style={styles.activeBadge}>
              <Eye size={14} color="#059669" />
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          ) : (
            <View style={styles.inactiveBadge}>
              <EyeOff size={14} color="#DC2626" />
              <Text style={styles.inactiveBadgeText}>Inactive</Text>
            </View>
          )}
          {product.isFeatured && (
            <View style={styles.featuredBadge}>
              <Star size={14} color="#F59E0B" />
              <Text style={styles.featuredBadgeText}>Featured</Text>
            </View>
          )}
        </View>

        {/* Basic Info */}
        <View style={styles.section}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productSlug}>/{product.slug}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatCurrency(product.price)}</Text>
            {product.comparePrice && product.comparePrice > product.price && (
              <Text style={styles.comparePrice}>
                {formatCurrency(product.comparePrice)}
              </Text>
            )}
          </View>

          <View style={styles.categoryRow}>
            <Tag size={16} color="#888" />
            <Text style={styles.categoryText}>{categoryName}</Text>
          </View>
        </View>

        {/* Stock Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Inventory</Text>
          <View style={styles.infoGrid}>
            <View style={styles.infoItem}>
              <Text style={styles.infoLabel}>Stock</Text>
              <Text
                style={[
                  styles.infoValue,
                  product.stock < 10 && styles.lowStock,
                ]}
              >
                {product.stock} units
              </Text>
            </View>
            {product.variants && product.variants.length > 0 && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Variants</Text>
                <Text style={styles.infoValue}>
                  {product.variants.length} variants
                </Text>
              </View>
            )}
            {(product as any).sku && (
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>SKU</Text>
                <Text style={styles.infoValue}>{(product as any).sku}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>

        {/* Variants */}
        {product.variants && product.variants.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Variants</Text>
            {product.variants.map((variant, index) => (
              <View key={variant._id || index} style={styles.variantItem}>
                <View style={styles.variantInfo}>
                  <Text style={styles.variantText}>
                    {variant.size}
                    {variant.color ? ` / ${variant.color}` : ""}
                  </Text>
                  <Text style={styles.variantStock}>
                    Stock: {variant.stock}
                  </Text>
                </View>
                <Text style={styles.variantPrice}>
                  {formatCurrency(variant.price)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Rating */}
        {product.ratings && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ratings</Text>
            <View style={styles.ratingRow}>
              <Star size={20} color="#F59E0B" fill="#F59E0B" />
              <Text style={styles.ratingValue}>
                {product.ratings.average.toFixed(1)}
              </Text>
              <Text style={styles.ratingCount}>
                ({product.ratings.count} reviews)
              </Text>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  headerActions: {
    flexDirection: "row",
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#f8f9fa",
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
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
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  imageGallery: {
    height: 300,
    backgroundColor: "#fff",
  },
  productImage: {
    width: 380,
    height: 300,
  },
  noImage: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f0f0f0",
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
    padding: 16,
    paddingBottom: 0,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  activeBadgeText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "500",
  },
  inactiveBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  inactiveBadgeText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "500",
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  featuredBadgeText: {
    color: "#D97706",
    fontSize: 12,
    fontWeight: "500",
  },
  section: {
    backgroundColor: "#fff",
    marginTop: 12,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 12,
  },
  productName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  productSlug: {
    fontSize: 14,
    color: "#888",
    marginBottom: 12,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  price: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  comparePrice: {
    fontSize: 18,
    color: "#888",
    textDecorationLine: "line-through",
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  categoryText: {
    fontSize: 14,
    color: "#666",
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  infoItem: {
    minWidth: 100,
  },
  infoLabel: {
    fontSize: 12,
    color: "#888",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  lowStock: {
    color: "#DC2626",
  },
  description: {
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
  },
  variantItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  variantInfo: {
    flex: 1,
  },
  variantText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  variantStock: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
  },
  variantPrice: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ratingValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  ratingCount: {
    fontSize: 14,
    color: "#888",
  },
});

export default AdminProductDetailScreen;
