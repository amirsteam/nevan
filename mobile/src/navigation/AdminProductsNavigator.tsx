/**
 * Admin Products Stack Navigator
 * Handles navigation within the admin products section
 */
import React, { JSX } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import {
  AdminProductsListScreen,
  AdminProductDetailScreen,
  AdminProductEditScreen,
} from "../screens/admin";
import type { AdminProductsStackParamList } from "./types";

const Stack = createStackNavigator<AdminProductsStackParamList>();

const AdminProductsNavigator = (): JSX.Element => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="AdminProductsList"
        component={AdminProductsListScreen}
      />
      <Stack.Screen
        name="AdminProductDetail"
        component={AdminProductDetailScreen}
      />
      <Stack.Screen
        name="AdminProductEdit"
        component={AdminProductEditScreen}
      />
    </Stack.Navigator>
  );
};

export default AdminProductsNavigator;
