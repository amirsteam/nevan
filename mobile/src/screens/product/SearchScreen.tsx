import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, X } from "lucide-react-native";
import { productsAPI } from "../../api/products";
import ProductCard from "../../components/ProductCard";
import type { SearchScreenProps } from "../../navigation/types";
import type { IProduct } from "@shared/types";

const SearchScreen: React.FC<SearchScreenProps> = ({ navigation }) => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleSearch = useCallback((text: string): void => {
    setQuery(text);

    // Clear previous timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (text.length < 2) {
      setResults([]);
      return;
    }

    // Debounce API call by 300ms
    timeoutRef.current = setTimeout(async () => {
      try {
        setLoading(true);
        const response = await productsAPI.searchProducts(text);
        setResults(response.data.products || []);
      } catch (error) {
        if (__DEV__) console.error("Search error:", error);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  const clearSearch = (): void => {
    setQuery("");
    setResults([]);
  };

  const renderItem: ListRenderItem<IProduct> = ({ item }) => (
    <ProductCard
      product={item}
      onPress={() => navigation.navigate("ProductDetail", { slug: item.slug })}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <Search size={20} color="#666" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder="Search for products..."
          value={query}
          onChangeText={handleSearch}
          autoFocus
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={clearSearch}>
            <X size={20} color="#666" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          numColumns={2}
          columnWrapperStyle={styles.columnWrapper}
          contentContainerStyle={styles.listContent}
        />
      ) : query.length >= 2 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No products found for "{query}"</Text>
        </View>
      ) : (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>Start typing to search...</Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    margin: 16,
    paddingHorizontal: 12,
    borderRadius: 8,
    height: 48,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  listContent: {
    padding: 16,
  },
  columnWrapper: {
    justifyContent: "space-between",
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});

export default SearchScreen;
