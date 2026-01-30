/**
 * Navigation Types
 * Centralized navigation type definitions for the mobile app
 */
import type {
  StackScreenProps,
  StackNavigationProp,
} from "@react-navigation/stack";
import type {
  BottomTabScreenProps,
  BottomTabNavigationProp,
} from "@react-navigation/bottom-tabs";
import type {
  CompositeScreenProps,
  CompositeNavigationProp,
  NavigatorScreenParams,
} from "@react-navigation/native";

// ==================== Root Stack ====================
export type RootStackParamList = {
  App: NavigatorScreenParams<AppStackParamList>;
  Auth: NavigatorScreenParams<AuthStackParamList>;
};

// ==================== Auth Stack ====================
export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  VerifyOTP: { email: string };
  ResetPassword: { email: string; otp: string };
};

// ==================== App Stack ====================
export type AppStackParamList = {
  Main: NavigatorScreenParams<TabParamList>;
  Checkout: undefined;
  Payment: {
    orderId: string;
    gateway: "cod" | "esewa" | "khalti";
    paymentData: {
      redirectUrl?: string;
      url?: string;
      payment_url?: string;
      formData?: Record<string, string>;
    };
  };
};

// ==================== Tab Navigator ====================
export type TabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  Cart: undefined;
  ProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// ==================== Profile Stack ====================
export type ProfileStackParamList = {
  ProfileScreen: undefined;
  Orders: undefined;
  OrderDetail: { orderId: string };
  Wishlist: undefined;
  Addresses: undefined;
  PaymentMethods: undefined;
  Preferences: undefined;
  HelpSupport: undefined;
};

// ==================== Home Stack ====================
export type HomeStackParamList = {
  HomeScreen: undefined;
  ProductList: {
    categorySlug?: string;
    categoryName?: string;
    search?: string;
  };
  ProductDetail: {
    slug: string;
  };
  Search: undefined;
};

// ==================== Screen Props ====================

// Auth screens
export type LoginScreenProps = StackScreenProps<AuthStackParamList, "Login">;
export type RegisterScreenProps = StackScreenProps<
  AuthStackParamList,
  "Register"
>;
export type ForgotPasswordScreenProps = StackScreenProps<
  AuthStackParamList,
  "ForgotPassword"
>;
export type VerifyOTPScreenProps = StackScreenProps<
  AuthStackParamList,
  "VerifyOTP"
>;
export type ResetPasswordScreenProps = StackScreenProps<
  AuthStackParamList,
  "ResetPassword"
>;

// Home stack screens
export type HomeScreenProps = CompositeScreenProps<
  StackScreenProps<HomeStackParamList, "HomeScreen">,
  CompositeScreenProps<
    BottomTabScreenProps<TabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

export type ProductListScreenProps = CompositeScreenProps<
  StackScreenProps<HomeStackParamList, "ProductList">,
  CompositeScreenProps<
    BottomTabScreenProps<TabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

export type ProductDetailScreenProps = CompositeScreenProps<
  StackScreenProps<HomeStackParamList, "ProductDetail">,
  CompositeScreenProps<
    BottomTabScreenProps<TabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

export type SearchScreenProps = CompositeScreenProps<
  StackScreenProps<HomeStackParamList, "Search">,
  CompositeScreenProps<
    BottomTabScreenProps<TabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

// Tab screens
export type CartScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, "Cart">,
  StackScreenProps<RootStackParamList>
>;

export type ProfileScreenProps = CompositeScreenProps<
  StackScreenProps<ProfileStackParamList, "ProfileScreen">,
  CompositeScreenProps<
    BottomTabScreenProps<TabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

// Profile stack screens
export type OrdersScreenProps = CompositeScreenProps<
  StackScreenProps<ProfileStackParamList, "Orders">,
  CompositeScreenProps<
    BottomTabScreenProps<TabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

export type OrderDetailScreenProps = CompositeScreenProps<
  StackScreenProps<ProfileStackParamList, "OrderDetail">,
  CompositeScreenProps<
    BottomTabScreenProps<TabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

export type WishlistScreenProps = CompositeScreenProps<
  StackScreenProps<ProfileStackParamList, "Wishlist">,
  CompositeScreenProps<
    BottomTabScreenProps<TabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

export type AddressesScreenProps = CompositeScreenProps<
  StackScreenProps<ProfileStackParamList, "Addresses">,
  CompositeScreenProps<
    BottomTabScreenProps<TabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

export type PaymentMethodsScreenProps = CompositeScreenProps<
  StackScreenProps<ProfileStackParamList, "PaymentMethods">,
  CompositeScreenProps<
    BottomTabScreenProps<TabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

export type PreferencesScreenProps = CompositeScreenProps<
  StackScreenProps<ProfileStackParamList, "Preferences">,
  CompositeScreenProps<
    BottomTabScreenProps<TabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

export type HelpSupportScreenProps = CompositeScreenProps<
  StackScreenProps<ProfileStackParamList, "HelpSupport">,
  CompositeScreenProps<
    BottomTabScreenProps<TabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

// Checkout screens
export type CheckoutScreenProps = CompositeScreenProps<
  StackScreenProps<AppStackParamList, "Checkout">,
  StackScreenProps<RootStackParamList>
>;

export type PaymentScreenProps = CompositeScreenProps<
  StackScreenProps<AppStackParamList, "Payment">,
  StackScreenProps<RootStackParamList>
>;

// ==================== Admin Tab Navigator ====================
export type AdminTabParamList = {
  AdminDashboard: undefined;
  AdminOrdersTab: NavigatorScreenParams<AdminOrdersStackParamList>;
  AdminProductsTab: NavigatorScreenParams<AdminProductsStackParamList>;
  AdminCategoriesTab: NavigatorScreenParams<AdminCategoriesStackParamList>;
  AdminUsersTab: undefined;
  AdminProfileTab: NavigatorScreenParams<ProfileStackParamList>;
};

// ==================== Admin Orders Stack ====================
export type AdminOrdersStackParamList = {
  AdminOrdersList: undefined;
  AdminOrderDetail: { orderId: string };
};

// ==================== Admin Products Stack ====================
export type AdminProductsStackParamList = {
  AdminProductsList: undefined;
  AdminProductDetail: { productId: string };
  AdminProductEdit: { productId?: string }; // undefined for create
};

// ==================== Admin Categories Stack ====================
export type AdminCategoriesStackParamList = {
  AdminCategoriesList: undefined;
  AdminCategoryEdit: { categoryId?: string }; // undefined for create
};

// ==================== Admin Screen Props ====================

// Admin Dashboard
export type AdminDashboardScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, "AdminDashboard">,
  StackScreenProps<RootStackParamList>
>;

// Admin Orders
export type AdminOrdersListScreenProps = CompositeScreenProps<
  StackScreenProps<AdminOrdersStackParamList, "AdminOrdersList">,
  CompositeScreenProps<
    BottomTabScreenProps<AdminTabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

export type AdminOrderDetailScreenProps = CompositeScreenProps<
  StackScreenProps<AdminOrdersStackParamList, "AdminOrderDetail">,
  CompositeScreenProps<
    BottomTabScreenProps<AdminTabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

// Admin Products
export type AdminProductsListScreenProps = CompositeScreenProps<
  StackScreenProps<AdminProductsStackParamList, "AdminProductsList">,
  CompositeScreenProps<
    BottomTabScreenProps<AdminTabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

export type AdminProductDetailScreenProps = CompositeScreenProps<
  StackScreenProps<AdminProductsStackParamList, "AdminProductDetail">,
  CompositeScreenProps<
    BottomTabScreenProps<AdminTabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

export type AdminProductEditScreenProps = CompositeScreenProps<
  StackScreenProps<AdminProductsStackParamList, "AdminProductEdit">,
  CompositeScreenProps<
    BottomTabScreenProps<AdminTabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

// Admin Users
export type AdminUsersScreenProps = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, "AdminUsersTab">,
  StackScreenProps<RootStackParamList>
>;

// Admin Categories
export type AdminCategoriesScreenProps = CompositeScreenProps<
  StackScreenProps<AdminCategoriesStackParamList, "AdminCategoriesList">,
  CompositeScreenProps<
    BottomTabScreenProps<AdminTabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

export type AdminCategoryEditScreenProps = CompositeScreenProps<
  StackScreenProps<AdminCategoriesStackParamList, "AdminCategoryEdit">,
  CompositeScreenProps<
    BottomTabScreenProps<AdminTabParamList>,
    StackScreenProps<RootStackParamList>
  >
>;

// ==================== Navigation Props (for useNavigation) ====================
export type RootNavigationProp = StackNavigationProp<RootStackParamList>;
export type HomeStackNavigationProp = StackNavigationProp<HomeStackParamList>;
export type AppStackNavigationProp = StackNavigationProp<AppStackParamList>;
export type ProfileStackNavigationProp =
  StackNavigationProp<ProfileStackParamList>;
export type AdminOrdersStackNavigationProp =
  StackNavigationProp<AdminOrdersStackParamList>;
export type AdminProductsStackNavigationProp =
  StackNavigationProp<AdminProductsStackParamList>;
export type AdminCategoriesStackNavigationProp =
  StackNavigationProp<AdminCategoriesStackParamList>;
