/**
 * Profile Stack Navigator
 * Handles profile, orders, and order detail screens
 */
import React, { JSX } from "react";
import { createStackNavigator } from "@react-navigation/stack";

import ProfileScreen from "../screens/profile/ProfileScreen";
import OrdersScreen from "../screens/orders/OrdersScreen";
import OrderDetailScreen from "../screens/orders/OrderDetailScreen";
import WishlistScreen from "../screens/wishlist/WishlistScreen";
import AddressesScreen from "../screens/profile/AddressesScreen";
import PaymentMethodsScreen from "../screens/profile/PaymentMethodsScreen";
import PreferencesScreen from "../screens/profile/PreferencesScreen";
import HelpSupportScreen from "../screens/profile/HelpSupportScreen";
import { ChatScreen } from "../screens/chat";
import NotificationsScreen from "../screens/notifications/NotificationsScreen";
import type { ProfileStackParamList } from "./types";

const Stack = createStackNavigator<ProfileStackParamList>();

const ProfileNavigator = (): JSX.Element => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: true,
        headerStyle: {
          backgroundColor: "#fff",
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: "#f0f0f0",
        },
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerTintColor: "#000",
      }}
    >
      <Stack.Screen
        name="ProfileScreen"
        component={ProfileScreen}
        options={{ title: "Profile" }}
      />
      <Stack.Screen
        name="Orders"
        component={OrdersScreen}
        options={{ title: "My Orders" }}
      />
      <Stack.Screen
        name="OrderDetail"
        component={OrderDetailScreen}
        options={{ title: "Order Details" }}
      />
      <Stack.Screen
        name="Wishlist"
        component={WishlistScreen}
        options={{ title: "My Wishlist" }}
      />
      <Stack.Screen
        name="Addresses"
        component={AddressesScreen}
        options={{ title: "My Addresses" }}
      />
      <Stack.Screen
        name="PaymentMethods"
        component={PaymentMethodsScreen}
        options={{ title: "Payment Methods" }}
      />
      <Stack.Screen
        name="Preferences"
        component={PreferencesScreen}
        options={{ title: "Preferences" }}
      />
      <Stack.Screen
        name="HelpSupport"
        component={HelpSupportScreen}
        options={{ title: "Help & Support" }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: "Support Chat" }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ title: "Notifications" }}
      />
    </Stack.Navigator>
  );
};

export default ProfileNavigator;
