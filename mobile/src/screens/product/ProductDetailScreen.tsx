import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Dimensions,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useGetProductQuery } from "../../store/api";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { addToCart } from "../../store/cartSlice";
import type { ProductDetailScreenProps } from "../../navigation/types";
import type { IProductVariant } from "@shared/types";

const { width } = Dimensions.get("window");

const ProductDetailScreen: React.FC<ProductDetailScreenProps> = ({
  route,
  navigation,
}) => {
  const { slug } = route.params;
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  // RTK Query hook with automatic caching
  const {
    data: product,
    isLoading,
    isFetching,
    refetch,
    isError,
  } = useGetProductQuery(slug);

  // Flat Variant State
  const [selectedSize, setSelectedSize] = useState("");
  const [selectedColor, setSelectedColor] = useState("");
  const [activeImage, setActiveImage] = useState<string | null>(null);

  // Derived state for current variant
  const currentVariant = product?.variants?.find(
    (v) => v.size === selectedSize && v.color === selectedColor,
  );

  // Initialize variants when product loads
  useEffect(() => {
    if (!product) return;

    if (product.variants && product.variants.length > 0) {
      const sizes = [...new Set(product.variants.map((v) => v.size))];

      if (sizes.length > 0) {
        const defaultSize = sizes[0];
        setSelectedSize(defaultSize);

        const availableColors = [
          ...new Set(
            product.variants
              .filter((v) => v.size === defaultSize)
              .map((v) => v.color),
          ),
        ];

        if (availableColors.length > 0) {
          setSelectedColor(availableColors[0]);

          const initialVariant = product.variants.find(
            (v) => v.size === defaultSize && v.color === availableColors[0],
          );
          if (initialVariant?.image) {
            setActiveImage(initialVariant.image);
            return;
          }
        }
      }
    }

    // Fallback to main image
    if (product.images?.length > 0) {
      setActiveImage(product.images[0].url);
    }
  }, [product]);

  const handleSizeChange = (size: string): void => {
    if (!product) return;
    setSelectedSize(size);

    // When size changes, check if current color is still valid
    const nextAvailableColors = [
      ...new Set(
        product.variants?.filter((v) => v.size === size).map((v) => v.color) ||
          [],
      ),
    ];

    // Reset color if invalid
    if (!nextAvailableColors.includes(selectedColor)) {
      const nextColor = nextAvailableColors[0] || "";
      setSelectedColor(nextColor);

      // Update image or fallback
      const nextVariant = product.variants?.find(
        (v) => v.size === size && v.color === nextColor,
      );
      setActiveImage(nextVariant?.image || product.images?.[0]?.url || null);
    } else {
      const nextVariant = product.variants?.find(
        (v) => v.size === size && v.color === selectedColor,
      );
      setActiveImage(nextVariant?.image || product.images?.[0]?.url || null);
    }
  };

  const handleColorChange = (color: string): void => {
    if (!product) return;
    setSelectedColor(color);
    const variant = product.variants?.find(
      (v) => v.size === selectedSize && v.color === color,
    );
    setActiveImage(variant?.image || product.images?.[0]?.url || null);
  };

  const getDisplayPrice = (): number => {
    if (currentVariant) {
      return currentVariant.price;
    }
    return product?.price || 0;
  };

  const handleAddToCart = (): void => {
    if (!product) return;

    if (!isAuthenticated) {
      Alert.alert("Login Required", "Please login to add items to cart", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Login",
          onPress: () => navigation.getParent()?.getParent()?.navigate("Auth"),
        },
      ]);
      return;
    }

    // Validation
    if (
      product.variants?.length &&
      product.variants.length > 0 &&
      !currentVariant
    ) {
      Alert.alert("Selection Required", "Please select a size and color");
      return;
    }

    // Stock Check
    const stockToCheck = currentVariant ? currentVariant.stock : product.stock;
    if (stockToCheck < 1) {
      Alert.alert("Out of Stock", "This item is currently out of stock");
      return;
    }

    dispatch(
      addToCart({
        productId: product._id,
        quantity: 1,
        variantId: currentVariant?._id,
        variantDetails: currentVariant
          ? {
              size: currentVariant.size,
              color: currentVariant.color,
            }
          : undefined,
      }),
    );

    Alert.alert("Success", "Added to cart!", [
      { text: "Continue Shopping", style: "cancel" },
      { text: "Go to Cart", onPress: () => navigation.navigate("Cart") },
    ]);
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  if (isError || !product) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.errorText}>Failed to load product</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!product) return null;

  // Derived Lists for UI
  const uniqueSizes = product.variants
    ? [...new Set(product.variants.map((v) => v.size))]
    : [];

  const availableColors = product.variants
    ? [
        ...new Set(
          product.variants
            .filter((v) => v.size === selectedSize)
            .map((v) => v.color),
        ),
      ]
    : [];

  const isOutOfStock =
    currentVariant?.stock === 0 ||
    (!product.variants?.length && product.stock === 0);
  const needsSelection =
    product.variants?.length && product.variants.length > 0 && !currentVariant;

  return (
    <SafeAreaView style={styles.container} edges={["bottom", "left", "right"]}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
      >
        <Image
          key={activeImage}
          source={{
            uri:
              activeImage ||
              product.images?.[0]?.url ||
              "https://via.placeholder.com/300",
          }}
          style={styles.image}
          resizeMode="cover"
        />
        <View style={styles.infoContainer}>
          <Text style={styles.name}>{product.name}</Text>
          <Text style={styles.price}>Rs. {getDisplayPrice().toFixed(2)}</Text>

          {/* Flat Variant UI */}
          {product.variants && product.variants.length > 0 && (
            <View style={styles.variantsSection}>
              {/* Size Selector */}
              <Text style={styles.variantTitle}>Size</Text>
              <View style={styles.optionsContainer}>
                {uniqueSizes.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.optionButton,
                      selectedSize === size && styles.selectedOptionButton,
                    ]}
                    onPress={() => handleSizeChange(size)}
                  >
                    <Text
                      style={[
                        styles.optionText,
                        selectedSize === size && styles.selectedOptionText,
                      ]}
                    >
                      {size}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Color Selector */}
              <Text style={[styles.variantTitle, { marginTop: 16 }]}>
                Color
              </Text>
              <View style={styles.optionsContainer}>
                {availableColors.map((color) => {
                  const variant = product.variants?.find(
                    (v) => v.size === selectedSize && v.color === color,
                  );
                  const variantOutOfStock = variant?.stock === 0;

                  return (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.optionButton,
                        selectedColor === color && styles.selectedOptionButton,
                        variantOutOfStock && styles.disabledOptionButton,
                      ]}
                      onPress={() => handleColorChange(color)}
                      disabled={variantOutOfStock}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          selectedColor === color && styles.selectedOptionText,
                          variantOutOfStock && styles.disabledOptionText,
                        ]}
                      >
                        {color}
                        {variantOutOfStock && " (Out)"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          <Text style={styles.descriptionLabel}>Description</Text>
          <Text style={styles.description}>{product.description}</Text>
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.addToCartButton,
            (needsSelection || isOutOfStock) && styles.disabledButton,
          ]}
          onPress={handleAddToCart}
          disabled={!!needsSelection || isOutOfStock}
        >
          <Text style={styles.addToCartText}>
            {isOutOfStock ? "Out of Stock" : "Add to Cart"}
          </Text>
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
  image: {
    width: width,
    height: 350,
    backgroundColor: "#FAFAFA",
  },
  infoContainer: {
    padding: 20,
    backgroundColor: "#FCFCFC",
  },
  name: {
    fontSize: 26,
    fontWeight: "700",
    color: "#4A4A4A",
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  price: {
    fontSize: 22,
    color: "#FF9999",
    fontWeight: "700",
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
    marginTop: 20,
  },
  description: {
    fontSize: 15,
    color: "#666",
    lineHeight: 24,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    backgroundColor: "#FCFCFC",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 5,
  },
  addToCartButton: {
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
  disabledButton: {
    backgroundColor: "#E0E0E0",
    shadowOpacity: 0,
    elevation: 0,
  },
  addToCartText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  variantsSection: {
    marginBottom: 10,
  },
  variantTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#555",
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  optionButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#EFEFEF",
    backgroundColor: "#fff",
    marginBottom: 8,
    minWidth: 50,
    alignItems: "center",
  },
  selectedOptionButton: {
    backgroundColor: "#FFF0F0",
    borderColor: "#FF9999",
  },
  disabledOptionButton: {
    backgroundColor: "#F9F9F9",
    borderColor: "#F0F0F0",
  },
  optionText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  selectedOptionText: {
    color: "#FF9999",
    fontWeight: "700",
  },
  disabledOptionText: {
    color: "#CCC",
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

export default ProductDetailScreen;
