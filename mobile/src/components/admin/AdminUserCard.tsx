/**
 * AdminUserCard Component
 * Displays user info for admin management
 */
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, Switch } from "react-native";
import { User, Shield, Mail, Phone } from "lucide-react-native";
import type { IUser } from "@shared/types";

interface AdminUserCardProps {
  user: IUser;
  onToggleStatus: (isActive: boolean) => void;
  onToggleRole: () => void;
  isLoading?: boolean;
}

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const AdminUserCard: React.FC<AdminUserCardProps> = ({
  user,
  onToggleStatus,
  onToggleRole,
  isLoading = false,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {user.avatar?.url ? (
            <View style={styles.avatar}>
              <User size={24} color="#666" />
            </View>
          ) : (
            <View style={styles.avatar}>
              <User size={24} color="#666" />
            </View>
          )}
        </View>

        <View style={styles.userInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user.name}</Text>
            {user.role === "admin" && (
              <View style={styles.adminBadge}>
                <Shield size={10} color="#7C3AED" />
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            )}
          </View>
          <View style={styles.contactRow}>
            <Mail size={12} color="#888" />
            <Text style={styles.email} numberOfLines={1}>
              {user.email}
            </Text>
          </View>
          {user.phone && (
            <View style={styles.contactRow}>
              <Phone size={12} color="#888" />
              <Text style={styles.phone}>{user.phone}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.joinDate}>Joined {formatDate(user.createdAt)}</Text>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.roleButton,
              user.role === "admin" ? styles.roleAdmin : styles.roleCustomer,
            ]}
            onPress={onToggleRole}
            disabled={isLoading}
          >
            <Text
              style={[
                styles.roleButtonText,
                user.role === "admin"
                  ? styles.roleAdminText
                  : styles.roleCustomerText,
              ]}
            >
              {user.role === "admin" ? "Make Customer" : "Make Admin"}
            </Text>
          </TouchableOpacity>

          <View style={styles.statusToggle}>
            <Text style={styles.statusLabel}>
              {user.isActive ? "Active" : "Inactive"}
            </Text>
            <Switch
              value={user.isActive}
              onValueChange={onToggleStatus}
              disabled={isLoading}
              trackColor={{ false: "#ddd", true: "#059669" }}
              thumbColor="#fff"
            />
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    flexDirection: "row",
    marginBottom: 16,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  adminBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#7C3AED",
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  email: {
    fontSize: 13,
    color: "#666",
    flex: 1,
  },
  phone: {
    fontSize: 13,
    color: "#666",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  joinDate: {
    fontSize: 12,
    color: "#888",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  roleButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  roleAdmin: {
    backgroundColor: "#FEF3C7",
  },
  roleCustomer: {
    backgroundColor: "#DBEAFE",
  },
  roleButtonText: {
    fontSize: 11,
    fontWeight: "600",
  },
  roleAdminText: {
    color: "#B45309",
  },
  roleCustomerText: {
    color: "#1D4ED8",
  },
  statusToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusLabel: {
    fontSize: 12,
    color: "#666",
  },
});

export default AdminUserCard;
