import React from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Home, ShoppingCart, User } from "lucide-react-native";

import HomeNavigator from "./HomeNavigator";
import CartScreen from "../screens/cart/CartScreen";
import ProfileScreen from "../screens/profile/ProfileScreen";

export type TabParamList = {
  HomeTab: undefined;
  Cart: undefined;
  Profile: undefined;
};

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
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ color, size }) => <User color={color} size={size} />,
        }}
      />
    </Tab.Navigator>
  );
};

export default TabNavigator;
