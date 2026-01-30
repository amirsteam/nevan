/**
 * Admin Users Screen
 * Displays all users with role/status management
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
import { Search, Filter, X } from "lucide-react-native";
import { AdminUserCard } from "../../components/admin";
import { adminAPI } from "../../api/admin";
import type { AdminUsersScreenProps } from "../../navigation/types";
import type { IUser, UserRole } from "@shared/types";

const USER_ROLES: (UserRole | "all")[] = ["all", "customer", "admin"];

const AdminUsersScreen: React.FC<AdminUsersScreenProps> = () => {
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [updatingUsers, setUpdatingUsers] = useState<Set<string>>(new Set());
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });

  const fetchUsers = useCallback(
    async (page: number = 1, append: boolean = false) => {
      try {
        setError(null);
        const response = await adminAPI.getUsers({
          page,
          limit: 20,
          role: selectedRole === "all" ? undefined : selectedRole,
          search: searchQuery || undefined,
        });

        if (append) {
          setUsers((prev) => [...prev, ...response.data.users]);
        } else {
          setUsers(response.data.users);
        }
        setPagination({
          page: response.pagination.page,
          pages: response.pagination.pages,
          total: response.pagination.total,
        });
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to load users");
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [selectedRole, searchQuery],
  );

  useEffect(() => {
    setLoading(true);
    fetchUsers(1);
  }, [fetchUsers]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchUsers(1);
  };

  const loadMore = () => {
    if (!loadingMore && pagination.page < pagination.pages) {
      setLoadingMore(true);
      fetchUsers(pagination.page + 1, true);
    }
  };

  const handleRoleFilter = (role: UserRole | "all") => {
    setSelectedRole(role);
    setShowFilters(false);
  };

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    setUpdatingUsers((prev) => new Set(prev).add(userId));
    try {
      const updatedUser = await adminAPI.updateUserStatus(userId, isActive);
      setUsers((prev) => prev.map((u) => (u._id === userId ? updatedUser : u)));
    } catch (err: any) {
      Alert.alert(
        "Error",
        err.response?.data?.message || "Failed to update user status",
      );
    } finally {
      setUpdatingUsers((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    }
  };

  const handleToggleRole = async (user: IUser) => {
    const newRole: UserRole = user.role === "admin" ? "customer" : "admin";

    Alert.alert(
      "Change User Role",
      `Change ${user.name}'s role to ${newRole}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            setUpdatingUsers((prev) => new Set(prev).add(user._id));
            try {
              const updatedUser = await adminAPI.updateUserRole(
                user._id,
                newRole,
              );
              setUsers((prev) =>
                prev.map((u) => (u._id === user._id ? updatedUser : u)),
              );
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.response?.data?.message || "Failed to update user role",
              );
            } finally {
              setUpdatingUsers((prev) => {
                const next = new Set(prev);
                next.delete(user._id);
                return next;
              });
            }
          },
        },
      ],
    );
  };

  const renderUserItem = ({ item }: { item: IUser }) => (
    <AdminUserCard
      user={item}
      onToggleStatus={(isActive: boolean) =>
        handleToggleStatus(item._id, isActive)
      }
      onToggleRole={() => handleToggleRole(item)}
      isLoading={updatingUsers.has(item._id)}
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
        <Text style={styles.emptyText}>No users found</Text>
        {(selectedRole !== "all" || searchQuery) && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              setSelectedRole("all");
              setSearchQuery("");
            }}
          >
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
        <Text style={styles.title}>Users</Text>
        <Text style={styles.subtitle}>{pagination.total} total users</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={18} color="#888" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => fetchUsers(1)}
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

      {/* Role Filter Pills */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          {USER_ROLES.map((role) => (
            <TouchableOpacity
              key={role}
              style={[
                styles.filterPill,
                selectedRole === role && styles.filterPillActive,
              ]}
              onPress={() => handleRoleFilter(role)}
            >
              <Text
                style={[
                  styles.filterPillText,
                  selectedRole === role && styles.filterPillTextActive,
                ]}
              >
                {role === "all"
                  ? "All Users"
                  : role.charAt(0).toUpperCase() + role.slice(1) + "s"}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Users List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => fetchUsers(1)}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item._id}
          renderItem={renderUserItem}
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

export default AdminUsersScreen;
