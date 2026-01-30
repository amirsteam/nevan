import React, { useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Image,
  ListRenderItem,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search } from "lucide-react-native";
import {
  useGetCategoriesQuery,
  useGetFeaturedProductsQuery,
} from "../../store/api";
import ProductCard from "../../components/ProductCard";
import type { HomeScreenProps } from "../../navigation/types";
import type { ICategory, IProduct } from "@shared/types";

const HomeScreen: React.FC<HomeScreenProps> = ({ navigation }) => {
  // RTK Query hooks with automatic caching
  const {
    data: categories = [],
    isLoading: categoriesLoading,
    refetch: refetchCategories,
  } = useGetCategoriesQuery();

  const {
    data: featuredData,
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = useGetFeaturedProductsQuery(8);

  const featuredProducts = featuredData?.products || [];
  const loading = categoriesLoading || productsLoading;

  const handleRefresh = useCallback((): void => {
    refetchCategories();
    refetchProducts();
  }, [refetchCategories, refetchProducts]);

  const handleProductPress = useCallback(
    (slug: string) => {
      navigation.navigate("ProductDetail", { slug });
    },
    [navigation],
  );

  const handleCategoryPress = useCallback(
    (categorySlug: string) => {
      navigation.navigate("ProductList", { categorySlug });
    },
    [navigation],
  );

  const renderCategory: ListRenderItem<ICategory> = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={styles.categoryItem}
        onPress={() => handleCategoryPress(item.slug)}
      >
        <View style={styles.categoryIcon}>
          {item.image?.url ? (
            <Image
              source={{ uri: item.image.url }}
              style={styles.categoryImage}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.categoryInitial}>{item.name.charAt(0)}</Text>
          )}
        </View>
        <Text style={styles.categoryName} numberOfLines={1}>
          {item.name}
        </Text>
      </TouchableOpacity>
    ),
    [handleCategoryPress],
  );

  const renderProduct: ListRenderItem<IProduct> = useCallback(
    ({ item }) => (
      <ProductCard
        product={item}
        onPress={() => handleProductPress(item.slug)}
      />
    ),
    [handleProductPress],
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLogoContainer}>
            <Image
              source={require("../../../assets/icon.png")}
              style={styles.headerLogo}
              resizeMode="contain"
            />
            <Text style={styles.headerTitleText}>Nevan Handicraft</Text>
          </View>
          <TouchableOpacity
            style={styles.searchBar}
            onPress={() => navigation.navigate("Search")}
          >
            <Search size={20} color="#666" style={styles.searchIcon} />
            <Text style={styles.searchText}>Search products...</Text>
          </TouchableOpacity>
        </View>

        {/* Categories */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Categories</Text>
          <FlatList
            data={categories}
            renderItem={renderCategory}
            keyExtractor={(item) => item._id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryList}
          />
        </View>

        {/* Featured Products */}
        <View style={[styles.section, { flex: 1 }]}>
          <Text style={styles.sectionTitle}>Featured Products</Text>
          <FlatList
            data={featuredProducts}
            renderItem={renderProduct}
            keyExtractor={(item) => item._id}
            numColumns={2}
            columnWrapperStyle={styles.productsGrid}
            scrollEnabled={false}
            contentContainerStyle={styles.productsList}
          />
        </View>
      </ScrollView>
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
  headerLogoContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  headerLogo: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  headerTitleText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#4A4A4A",
    fontFamily: "System",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F7F7",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#EFEFEF",
  },
  searchIcon: {
    marginRight: 10,
  },
  searchText: {
    color: "#999",
    fontSize: 15,
  },
  section: {
    marginVertical: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginLeft: 20,
    marginBottom: 16,
    color: "#333",
    letterSpacing: 0.5,
  },
  categoryList: {
    paddingHorizontal: 20,
  },
  categoryItem: {
    alignItems: "center",
    marginRight: 20,
    width: 72,
  },
  categoryIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#FFF5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFE4E4",
    shadowColor: "#FFD7D7",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryImage: {
    width: "100%",
    height: "100%",
  },
  categoryInitial: {
    fontSize: 28,
    fontWeight: "600",
    color: "#FF9999",
  },
  categoryName: {
    fontSize: 13,
    textAlign: "center",
    color: "#666",
    fontWeight: "500",
  },
  productsGrid: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  productsList: {
    paddingHorizontal: 0,
  },
});

export default HomeScreen;
