/**
 * Admin Categories List Screen
 * Displays all categories with CRUD operations
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
import { Search, Plus, X, FolderTree } from "lucide-react-native";
import { AdminCategoryCard } from "../../components/admin";
import { adminAPI } from "../../api/admin";
import type { AdminCategoriesScreenProps } from "../../navigation/types";
import type { ICategory } from "@shared/types";

const AdminCategoriesScreen: React.FC<AdminCategoriesScreenProps> = ({
  navigation,
}) => {
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const fetchCategories = useCallback(async () => {
    try {
      setError(null);
      const data = await adminAPI.getCategories();
      setCategories(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load categories");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Refresh when screen comes into focus
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      fetchCategories();
    });
    return unsubscribe;
  }, [navigation, fetchCategories]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  // Filter categories by search
  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  // Get child count for a category
  const getChildCount = (categoryId: string): number => {
    return categories.filter((cat) => {
      const parentId =
        typeof cat.parent === "object" ? cat.parent?._id : cat.parent;
      return parentId === categoryId;
    }).length;
  };

  const handleCategoryPress = (category: ICategory) => {
    // Navigate to detail/edit screen
    navigation.navigate("AdminCategoryEdit", { categoryId: category._id });
  };

  const handleEditCategory = (category: ICategory) => {
    navigation.navigate("AdminCategoryEdit", { categoryId: category._id });
  };

  const handleAddCategory = () => {
    navigation.navigate("AdminCategoryEdit", {});
  };

  const handleDeleteCategory = async (category: ICategory) => {
    const childCount = getChildCount(category._id);
    const message =
      childCount > 0
        ? `This category has ${childCount} subcategories. Deleting it will also affect them. Are you sure?`
        : `Are you sure you want to delete "${category.name}"?`;

    Alert.alert("Delete Category", message, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await adminAPI.deleteCategory(category._id);
            setCategories((prev) => prev.filter((c) => c._id !== category._id));
            Alert.alert("Success", "Category deleted");
          } catch (err: any) {
            Alert.alert(
              "Error",
              err.response?.data?.message || "Failed to delete category",
            );
          }
        },
      },
    ]);
  };

  const renderCategoryItem = ({ item }: { item: ICategory }) => (
    <AdminCategoryCard
      category={item}
      onPress={() => handleCategoryPress(item)}
      onEdit={() => handleEditCategory(item)}
      onDelete={() => handleDeleteCategory(item)}
      childCount={getChildCount(item._id)}
    />
  );

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <FolderTree size={48} color="#ddd" />
        <Text style={styles.emptyText}>No categories found</Text>
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
            <Text style={styles.title}>Categories</Text>
            <Text style={styles.subtitle}>
              {categories.length} total categories
            </Text>
          </View>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddCategory}
          >
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
            placeholder="Search categories..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={18} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Categories List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={fetchCategories}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          keyExtractor={(item) => item._id}
          renderItem={renderCategoryItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
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
    color: "#888",
    marginTop: 2,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  addButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
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
    borderColor: "#eee",
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: "#1a1a1a",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  loadingContainer: {
    flex: 1,
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
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#888",
    marginTop: 12,
  },
  clearButton: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  clearButtonText: {
    color: "#1a1a1a",
    fontWeight: "500",
  },
});

export default AdminCategoriesScreen;
