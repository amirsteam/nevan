import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Package,
  Heart,
  MapPin,
  CreditCard,
  Settings,
  HelpCircle,
  LogOut,
  ChevronRight,
  User,
} from "lucide-react-native";
import { useAppDispatch, useAppSelector } from "../../store/hooks";
import { logout } from "../../store/authSlice";
import type { ProfileScreenProps } from "../../navigation/types";

interface MenuItemProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onPress: () => void;
  showBadge?: boolean;
  badgeCount?: number;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  title,
  subtitle,
  onPress,
  showBadge,
  badgeCount,
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuIconContainer}>{icon}</View>
    <View style={styles.menuTextContainer}>
      <Text style={styles.menuTitle}>{title}</Text>
      {subtitle && <Text style={styles.menuSubtitle}>{subtitle}</Text>}
    </View>
    <View style={styles.menuRight}>
      {showBadge && badgeCount && badgeCount > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeCount}</Text>
        </View>
      )}
      <ChevronRight size={20} color="#999" />
    </View>
  </TouchableOpacity>
);

const ProfileScreen: React.FC<ProfileScreenProps> = ({ navigation }) => {
  const dispatch = useAppDispatch();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  const handleLogout = (): void => {
    dispatch(logout());
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container} edges={["left", "right"]}>
        <View style={styles.guestContent}>
          <View style={styles.guestIconContainer}>
            <User size={48} color="#666" />
          </View>
          <Text style={styles.guestTitle}>Connect with Nevan</Text>
          <Text style={styles.guestSubtitle}>
            Sign in to view your orders, wishlist and more.
          </Text>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={() => navigation.navigate("Auth", { screen: "Login" })}
          >
            <Text style={styles.loginButtonText}>Sign In / Register</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["left", "right"]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Header */}
        <View style={styles.userHeader}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.userName}>{user?.name || "User"}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>My Account</Text>

          <MenuItem
            icon={<Package size={22} color="#333" />}
            title="My Orders"
            subtitle="Track, return, or buy things again"
            onPress={() => navigation.navigate("Orders")}
          />

          <MenuItem
            icon={<Heart size={22} color="#333" />}
            title="Wishlist"
            subtitle="Your saved items"
            onPress={() => navigation.navigate("Wishlist")}
          />

          <MenuItem
            icon={<MapPin size={22} color="#333" />}
            title="Addresses"
            subtitle="Manage delivery addresses"
            onPress={() => navigation.navigate("Addresses")}
          />

          <MenuItem
            icon={<CreditCard size={22} color="#333" />}
            title="Payment Methods"
            subtitle="View payment options"
            onPress={() => navigation.navigate("PaymentMethods")}
          />
        </View>

        <View style={styles.menuSection}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <MenuItem
            icon={<Settings size={22} color="#333" />}
            title="Preferences"
            subtitle="Notifications, language"
            onPress={() => navigation.navigate("Preferences")}
          />

          <MenuItem
            icon={<HelpCircle size={22} color="#333" />}
            title="Help & Support"
            subtitle="FAQs, contact us"
            onPress={() => navigation.navigate("HelpSupport")}
          />
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <LogOut size={20} color="#F44336" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Version 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  scrollContent: {
    paddingBottom: 32,
  },
  guestContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  guestIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  guestTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  guestSubtitle: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 24,
  },
  loginButton: {
    backgroundColor: "#000",
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  loginButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  userHeader: {
    backgroundColor: "#fff",
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  avatarContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
  },
  userInfo: {
    marginLeft: 16,
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: "#666",
  },
  menuSection: {
    backgroundColor: "#fff",
    marginTop: 16,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#999",
    textTransform: "uppercase",
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  menuTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
  menuSubtitle: {
    fontSize: 13,
    color: "#999",
    marginTop: 2,
  },
  menuRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  badge: {
    backgroundColor: "#F44336",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    marginTop: 16,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
    borderColor: "#F44336",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#F44336",
  },
  versionText: {
    textAlign: "center",
    color: "#999",
    fontSize: 12,
    marginTop: 24,
  },
});

export default ProfileScreen;
