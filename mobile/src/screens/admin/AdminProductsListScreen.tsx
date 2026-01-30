/**
 * Admin Products List Screen
 * Displays all products with search functionality
 */
import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, Plus, X } from "lucide-react-native";
import { AdminProductCard } from "../../components/admin";
import { adminAPI } from "../../api/admin";
import type { AdminProductsListScreenProps } from "../../navigation/types";
import type { IProduct } from "@shared/types";

const AdminProductsListScreen: React.FC<AdminProductsListScreenProps> = ({
  navigation,
}) => {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });

  const fetchProducts = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        setError(null);
        const response = await adminAPI.getProducts({
          page,
          limit: 20,
          search: searchQuery || undefined,
        });

        if (append) {
          setProducts((prev) => [...prev, ...response.data.products]);
        } else {
          setProducts(response.data.products);
        }
        setPagination({
          page: response.pagination.page,
          pages: response.pagination.pages,
          total: response.pagination.total,
        });
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load products");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [searchQuery],
  );

  useEffect(() => {
    setLoading(true);
    fetchProducts(1);
  }, [fetchProducts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts(1);
  };

  const loadMore = () => {
    if (!loadingMore && pagination.page < pagination.pages) {
      setLoadingMore(true);
      fetchProducts(pagination.page + 1, true);
    }
  };

  const handleProductPress = (productId: string) => {
    navigation.navigate("AdminProductDetail", { productId });
  };

  const handleAddProduct = () => {
    navigation.navigate("AdminProductEdit", {});
  };

  const handleDeleteProduct = async (
    productId: string,
    productName: string,
  ) => {
    Alert.alert(
      "Delete Product",
      `Are you sure you want to delete "${productName}"?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await adminAPI.deleteProduct(productId);
              setProducts((prev) => prev.filter((p) => p._id !== productId));
              Alert.alert("Success", "Product deleted");
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

  const renderProductItem = ({ item }: { item: IProduct }) => (
    <AdminProductCard
      product={item}
      onPress={() => handleProductPress(item._id)}
    />
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No products found</Text>
        {searchQuery && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => setSearchQuery("")}
          >
            <Text style={styles.clearButtonText}>Clear Search</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.title}>Products</Text>
            <Text style={styles.subtitle}>
              {pagination.total} total products
            </Text>
          </View>
          <TouchableOpacity style={styles.addButton} onPress={handleAddProduct}>
            <Plus size={20} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => fetchProducts(1)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={18} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Products List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchProducts(1)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          renderItem={renderProductItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  searchContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#1a1a1a",
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
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
  footerLoader: {
    paddingVertical: 20,
  },
  emptyContainer: {
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
  clearButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#1a1a1a",
    borderRadius: 6,
  },
  clearButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
});

export default AdminProductsListScreen;
