/**
 * Admin Orders Stack Navigator
 * Handles navigation within the admin orders section
 */
import React, { JSX } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import {
  AdminOrdersListScreen,
  AdminOrderDetailScreen,
} from "../screens/admin";
import type { AdminOrdersStackParamList } from "./types";

const Stack = createStackNavigator<AdminOrdersStackParamList>();

const AdminOrdersNavigator = (): JSX.Element => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminOrdersList" component={AdminOrdersListScreen} />
      <Stack.Screen
        name="AdminOrderDetail"
        component={AdminOrderDetailScreen}
      />
    </Stack.Navigator>
  );
};

export default AdminOrdersNavigator;
