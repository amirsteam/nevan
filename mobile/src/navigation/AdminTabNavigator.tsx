/**
 * Admin Tab Navigator
 * Bottom tab navigation for admin users
 */
import React, { JSX } from "react";
import { Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  LayoutDashboard,
  ShoppingBag,
  Package,
  FolderTree,
  Users,
  User,
} from "lucide-react-native";

import { AdminDashboardScreen, AdminUsersScreen } from "../screens/admin";
import AdminOrdersNavigator from "./AdminOrdersNavigator";
import AdminProductsNavigator from "./AdminProductsNavigator";
import AdminCategoriesNavigator from "./AdminCategoriesNavigator";
import ProfileNavigator from "./ProfileNavigator";
import type { AdminTabParamList } from "./types";

export type { AdminTabParamList };

const Tab = createBottomTabNavigator<AdminTabParamList>();

const AdminTabNavigator = (): JSX.Element => {
  const insets = useSafeAreaInsets();
  // Add safe area bottom padding to prevent overlap with system navigation bar
  const tabBarHeight =
    60 +
    (Platform.OS === "android" ? Math.max(insets.bottom, 10) : insets.bottom);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#1a1a1a",
        tabBarInactiveTintColor: "#888",
        tabBarStyle: {
          paddingTop: 5,
          paddingBottom:
            Platform.OS === "android"
              ? Math.max(insets.bottom, 10)
              : insets.bottom,
          borderTopWidth: 1,
          borderTopColor: "#f0f0f0",
          height: tabBarHeight,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "500",
        },
      }}
    >
      <Tab.Screen
        name="AdminDashboard"
        component={AdminDashboardScreen}
        options={{
          title: "Dashboard",
          tabBarIcon: ({ color, size }) => (
            <LayoutDashboard color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminOrdersTab"
        component={AdminOrdersNavigator}
        options={{
          title: "Orders",
          tabBarIcon: ({ color, size }) => (
            <ShoppingBag color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminProductsTab"
        component={AdminProductsNavigator}
        options={{
          title: "Products",
          tabBarIcon: ({ color, size }) => (
            <Package color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminCategoriesTab"
        component={AdminCategoriesNavigator}
        options={{
          title: "Categories",
          tabBarIcon: ({ color, size }) => (
            <FolderTree color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="AdminUsersTab"
        component={AdminUsersScreen}
        options={{
          title: "Users",
          tabBarIcon: ({ color, size }) => <Users color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default AdminTabNavigator;
