import React, { JSX } from "react";
import { createStackNavigator } from "@react-navigation/stack";

import HomeScreen from "../screens/home/HomeScreen";
import ProductListScreen from "../screens/product/ProductListScreen";
import ProductDetailScreen from "../screens/product/ProductDetailScreen";
import SearchScreen from "../screens/product/SearchScreen";
import type { HomeStackParamList } from "./types";

export type { HomeStackParamList };

const Stack = createStackNavigator<HomeStackParamList>();

const HomeNavigator = (): JSX.Element => {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="HomeScreen"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="ProductList"
        component={ProductListScreen}
        options={{ title: "Products" }}
      />
      <Stack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ title: "Product Details" }}
      />
      <Stack.Screen
        name="Search"
        component={SearchScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
};

export default HomeNavigator;
