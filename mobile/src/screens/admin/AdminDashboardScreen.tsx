/**
 * Admin Dashboard Screen
 * Shows overview stats and recent orders
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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ShoppingBag,
  Package,
  Users,
  DollarSign,
  ChevronRight,
  TrendingUp,
  LogOut,
} from "lucide-react-native";
import { StatCard, AdminOrderCard } from "../../components/admin";
import { adminAPI } from "../../api/admin";
import { useAppDispatch } from "../../store/hooks";
import { logout } from "../../store/authSlice";
import type { AdminDashboardScreenProps } from "../../navigation/types";
import type { IDashboardStats, IOrder } from "@shared/types";

const formatCurrency = (amount: number): string => {
  return `Rs. ${amount.toLocaleString()}`;
};

const AdminDashboardScreen: React.FC<AdminDashboardScreenProps> = ({
  navigation,
}) => {
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<IDashboardStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    try {
      setError(null);
      const data = await adminAPI.getDashboard();
      setStats(data);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const handleOrderPress = (orderId: string) => {
    navigation.navigate("AdminOrdersTab", {
      screen: "AdminOrderDetail",
      params: { orderId },
    });
  };

  const handleViewAllOrders = () => {
    navigation.navigate("AdminOrdersTab", { screen: "AdminOrdersList" });
  };

  const handleLogout = () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => dispatch(logout()),
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchDashboard}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "left", "right"]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View>
              <Text style={styles.greeting}>Welcome back!</Text>
              <Text style={styles.title}>Dashboard</Text>
            </View>
            <TouchableOpacity
              style={styles.logoutButton}
              onPress={handleLogout}
            >
              <LogOut size={20} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsContainer}>
          <View style={styles.statsRow}>
            <StatCard
              icon={<ShoppingBag size={20} color="#1D4ED8" />}
              value={stats?.totalOrders || 0}
              label="Total Orders"
              color="#1D4ED8"
              backgroundColor="#EFF6FF"
            />
            <StatCard
              icon={<DollarSign size={20} color="#059669" />}
              value={formatCurrency(stats?.totalRevenue || 0)}
              label="Revenue"
              color="#059669"
              backgroundColor="#ECFDF5"
            />
          </View>
          <View style={styles.statsRow}>
            <StatCard
              icon={<Package size={20} color="#7C3AED" />}
              value={stats?.totalProducts || 0}
              label="Products"
              color="#7C3AED"
              backgroundColor="#F5F3FF"
            />
            <StatCard
              icon={<Users size={20} color="#DC2626" />}
              value={stats?.totalCustomers || 0}
              label="Customers"
              color="#DC2626"
              backgroundColor="#FEF2F2"
            />
          </View>
        </View>

        {/* Recent Orders Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleContainer}>
              <TrendingUp size={20} color="#1a1a1a" />
              <Text style={styles.sectionTitle}>Recent Orders</Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={handleViewAllOrders}
            >
              <Text style={styles.viewAllText}>View All</Text>
              <ChevronRight size={16} color="#666" />
            </TouchableOpacity>
          </View>

          {stats?.recentOrders && stats.recentOrders.length > 0 ? (
            stats.recentOrders.map((order: IOrder) => (
              <AdminOrderCard
                key={order._id}
                order={order}
                onPress={() => handleOrderPress(order._id)}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <ShoppingBag size={48} color="#ddd" />
              <Text style={styles.emptyStateText}>No recent orders</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
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
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  logoutButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#FEF2F2",
  },
  greeting: {
    fontSize: 14,
    color: "#666",
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  statsContainer: {
    marginBottom: 24,
  },
  statsRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewAllText: {
    fontSize: 14,
    color: "#666",
  },
  emptyState: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 40,
    alignItems: "center",
  },
  emptyStateText: {
    marginTop: 12,
    fontSize: 14,
    color: "#999",
  },
});

export default AdminDashboardScreen;
