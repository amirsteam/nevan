import React, { JSX } from "react";
import { View, Platform } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Home, ShoppingCart, User } from "lucide-react-native";

import HomeNavigator from "./HomeNavigator";
import ProfileNavigator from "./ProfileNavigator";
import CartScreen from "../screens/cart/CartScreen";
import Badge from "../components/Badge";
import { useAppSelector } from "../store/hooks";
import type { TabParamList } from "./types";

export type { TabParamList };

const Tab = createBottomTabNavigator<TabParamList>();

// Cart icon with badge
const CartTabIcon: React.FC<{ color: string; size: number }> = ({
  color,
  size,
}) => {
  const { itemCount } = useAppSelector((state) => state.cart);

  return (
    <Badge count={itemCount} size="small" variant="primary">
      <ShoppingCart color={color} size={size} />
    </Badge>
  );
};

const TabNavigator = (): JSX.Element => {
  const insets = useSafeAreaInsets();
  // Add safe area bottom padding to prevent overlap with system navigation bar
  const tabBarHeight =
    60 +
    (Platform.OS === "android" ? Math.max(insets.bottom, 10) : insets.bottom);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#000",
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
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeNavigator}
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Cart"
        component={CartScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <CartTabIcon color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="ProfileTab"
        component={ProfileNavigator}
        options={{
          title: "Profile",
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
