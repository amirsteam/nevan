/**
 * Admin Orders List Screen
 * Displays all orders with filtering and search
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Search, Filter, X } from "lucide-react-native";
import { AdminOrderCard, OrderStatusBadge } from "../../components/admin";
import { adminAPI } from "../../api/admin";
import type { AdminOrdersListScreenProps } from "../../navigation/types";
import type { IOrder, OrderStatus } from "@shared/types";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const AdminOrdersListScreen: React.FC<AdminOrdersListScreenProps> = ({
  navigation,
}) => {
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<OrderStatus | null>(
    null,
  );
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });

  const fetchOrders = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        setError(null);
        const response = await adminAPI.getOrders({
          page,
          limit: 20,
          status: selectedStatus || undefined,
          search: searchQuery || undefined,
        });

        if (append) {
          setOrders((prev) => [...prev, ...response.data.orders]);
        } else {
          setOrders(response.data.orders);
        }
        setPagination({
          page: response.pagination.page,
          pages: response.pagination.pages,
          total: response.pagination.total,
        });
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load orders");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [selectedStatus, searchQuery],
  );

  useEffect(() => {
    setLoading(true);
    fetchOrders(1);
  }, [fetchOrders]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders(1);
  };

  const loadMore = () => {
    if (!loadingMore && pagination.page < pagination.pages) {
      setLoadingMore(true);
      fetchOrders(pagination.page + 1, true);
    }
  };

  const handleOrderPress = (orderId: string) => {
    navigation.navigate("AdminOrderDetail", { orderId });
  };

  const handleStatusFilter = (status: OrderStatus | null) => {
    setSelectedStatus(status);
    setShowFilters(false);
  };

  const clearFilters = () => {
    setSelectedStatus(null);
    setSearchQuery("");
  };

  const renderOrderItem = ({ item }: { item: IOrder }) => (
    <AdminOrderCard order={item} onPress={() => handleOrderPress(item._id)} />
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
        <Text style={styles.emptyText}>No orders found</Text>
        {(selectedStatus || searchQuery) && (
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={styles.clearButtonText}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Orders</Text>
        <Text style={styles.subtitle}>{pagination.total} total orders</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => fetchOrders(1)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={18} color="#888" />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.filterButton,
            showFilters && styles.filterButtonActive,
          ]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Filter size={18} color={showFilters ? "#fff" : "#1a1a1a"} />
        </TouchableOpacity>
      </View>

      {/* Status Filter Pills */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              selectedStatus === null && styles.filterPillActive,
            ]}
            onPress={() => handleStatusFilter(null)}
          >
            <Text
              style={[
                styles.filterPillText,
                selectedStatus === null && styles.filterPillTextActive,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {ORDER_STATUSES.map((status) => (
            <TouchableOpacity
              key={status}
              style={[
                styles.filterPill,
                selectedStatus === status && styles.filterPillActive,
              ]}
              onPress={() => handleStatusFilter(status)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedStatus === status && styles.filterPillTextActive,
                ]}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Active Filters */}
      {(selectedStatus || searchQuery) && (
        <View style={styles.activeFilters}>
          {selectedStatus && (
            <View style={styles.activeFilterChip}>
              <OrderStatusBadge status={selectedStatus} size="small" />
              <TouchableOpacity onPress={() => setSelectedStatus(null)}>
                <X size={14} color="#666" />
              </TouchableOpacity>
            </View>
          )}
          {searchQuery && (
            <View style={styles.activeFilterChip}>
              <Text style={styles.activeFilterText}>"{searchQuery}"</Text>
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X size={14} color="#666" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      {/* Orders List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchOrders(1)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderItem}
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
  searchContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  searchInputContainer: {
    flex: 1,
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
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterButtonActive: {
    backgroundColor: "#1a1a1a",
    borderColor: "#1a1a1a",
  },
  filtersContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  filterPillActive: {
    backgroundColor: "#1a1a1a",
    borderColor: "#1a1a1a",
  },
  filterPillText: {
    fontSize: 13,
    color: "#666",
    fontWeight: "500",
  },
  filterPillTextActive: {
    color: "#fff",
  },
  activeFilters: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fff",
    paddingLeft: 4,
    paddingRight: 8,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  activeFilterText: {
    fontSize: 12,
    color: "#666",
    marginLeft: 8,
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

export default AdminOrdersListScreen;
