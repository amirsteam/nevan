import React, { JSX } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, ShoppingCart, User } from "lucide-react-native";

import HomeNavigator from "./HomeNavigator";
import ProfileNavigator from "./ProfileNavigator";
import CartScreen from "../screens/cart/CartScreen";
import type { TabParamList } from "./types";

export type { TabParamList };

const Tab = createBottomTabNavigator<TabParamList>();

const TabNavigator = (): JSX.Element => {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#000",
        tabBarInactiveTintColor: "#888",
        tabBarStyle: {
          paddingVertical: 5,
          borderTopWidth: 1,
          borderTopColor: "#f0f0f0",
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
            <ShoppingCart color={color} size={size} />
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
