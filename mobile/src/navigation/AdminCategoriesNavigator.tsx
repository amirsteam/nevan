/**
 * Admin Categories Navigator
 * Stack navigation for categories management
 */
import React, { JSX } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import {
  AdminCategoriesScreen,
  AdminCategoryEditScreen,
} from "../screens/admin";
import type { AdminCategoriesStackParamList } from "./types";

const Stack = createStackNavigator<AdminCategoriesStackParamList>();

const AdminCategoriesNavigator = (): JSX.Element => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen
        name="AdminCategoriesList"
        component={AdminCategoriesScreen}
      />
      <Stack.Screen
        name="AdminCategoryEdit"
        component={AdminCategoryEditScreen}
      />
    </Stack.Navigator>
  );
};

export default AdminCategoriesNavigator;
