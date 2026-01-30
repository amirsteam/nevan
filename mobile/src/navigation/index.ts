/**
 * Navigation Module Exports
 * Clean exports for navigation components and types
 */
export { default as RootNavigator } from "./RootNavigator";
export { default as TabNavigator } from "./TabNavigator";
export { default as HomeNavigator } from "./HomeNavigator";
export { default as AdminTabNavigator } from "./AdminTabNavigator";
export { default as AdminOrdersNavigator } from "./AdminOrdersNavigator";
export { default as AdminProductsNavigator } from "./AdminProductsNavigator";
export { default as AdminCategoriesNavigator } from "./AdminCategoriesNavigator";
export {
  default as linking,
  generateProductShareUrl,
  generateOrderShareUrl,
  parseDeepLink,
} from "./linking";

// Type exports
export type {
  RootStackParamList,
  AuthStackParamList,
  AppStackParamList,
  TabParamList,
  HomeStackParamList,
  // Admin types
  AdminTabParamList,
  AdminOrdersStackParamList,
  AdminProductsStackParamList,
  AdminCategoriesStackParamList,
  // Screen props
  LoginScreenProps,
  RegisterScreenProps,
  HomeScreenProps,
  ProductListScreenProps,
  ProductDetailScreenProps,
  SearchScreenProps,
  CartScreenProps,
  ProfileScreenProps,
  CheckoutScreenProps,
  PaymentScreenProps,
  // Admin screen props
  AdminDashboardScreenProps,
  AdminOrdersListScreenProps,
  AdminOrderDetailScreenProps,
  AdminProductsListScreenProps,
  AdminProductDetailScreenProps,
  AdminProductEditScreenProps,
  AdminCategoriesScreenProps,
  AdminCategoryEditScreenProps,
  AdminUsersScreenProps,
  // Navigation props
  RootNavigationProp,
  HomeStackNavigationProp,
  AppStackNavigationProp,
  AdminOrdersStackNavigationProp,
  AdminProductsStackNavigationProp,
  AdminCategoriesStackNavigationProp,
} from "./types";
