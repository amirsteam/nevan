import React, { useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  ListRenderItem,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useGetProductsQuery,
  useGetCategoryProductsQuery,
  useGetCategoryQuery,
  useSearchProductsQuery,
} from "../../store/api";
import ProductCard from "../../components/ProductCard";
import type { ProductListScreenProps } from "../../navigation/types";
import type { IProduct } from "@shared/types";

const ProductListScreen: React.FC<ProductListScreenProps> = ({
  route,
  navigation,
}) => {
  const { categorySlug, categoryName, search } = route.params || {};

  // Conditionally use different queries based on params
  const categoryQuery = useGetCategoryProductsQuery(
    { slug: categorySlug || "" },
    { skip: !categorySlug },
  );

  const searchQuery = useSearchProductsQuery(
    { query: search || "" },
    { skip: !search || !!categorySlug },
  );

  const allProductsQuery = useGetProductsQuery(
    {},
    { skip: !!categorySlug || !!search },
  );

  // Get category name for header
  const { data: category } = useGetCategoryQuery(categorySlug || "", {
    skip: !categorySlug || !!categoryName,
  });

  // Determine which query to use
  const activeQuery = categorySlug
    ? categoryQuery
    : search
      ? searchQuery
      : allProductsQuery;

  const { data, isLoading, isFetching, refetch } = activeQuery;
  const products = data?.products || [];

  // Update navigation title
  useEffect(() => {
    const title =
      categoryName ||
      category?.name ||
      (search ? `Search: ${search}` : "Products");
    navigation.setOptions({ title });
  }, [categoryName, category, search, navigation]);

  const renderItem: ListRenderItem<IProduct> = ({ item }) => (
    <ProductCard
      product={item}
      onPress={() => navigation.navigate("ProductDetail", { slug: item.slug })}
    />
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <FlatList
        data={products}
        keyExtractor={(item) => item._id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        }
      />
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
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
});

export default ProductListScreen;
