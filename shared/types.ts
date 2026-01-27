/**
 * Global Type Definitions
 * Shared types between frontend, mobile, and backend
 */

// ============================================
// Common Types
// ============================================

export interface IImage {
  url: string;
  publicId: string;
}

export interface IApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

export interface IPaginatedResponse<T> {
  success: boolean;
  data: T;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============================================
// User Types
// ============================================

export type UserRole = "customer" | "admin";

export interface IUser {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  avatar?: IImage;
  createdAt: string;
  updatedAt: string;
}

export interface IAuthResponse {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

export interface ILoginCredentials {
  email: string;
  password: string;
}

export interface IRegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
}

// ============================================
// Category Types
// ============================================

export interface ICategory {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: IImage;
}

// ============================================
// Product Types
// ============================================

export interface IProductVariant {
  _id: string;
  size: string;
  color: string;
  sku?: string;
  price: number;
  stock: number;
  image?: string; // URL string, not IImage object
}

export interface IProduct {
  _id: string;
  name: string;
  slug: string;
  description: string;
  price: number;
  comparePrice?: number;
  category: string | ICategory;
  images: IImage[];
  stock: number;
  ratings?: number;
  numReviews?: number;
  isFeatured?: boolean;
  variants?: IProductVariant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface IProductsResponse {
  products: IProduct[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// ============================================
// Cart Types
// ============================================

export interface ICartItem {
  _id: string;
  product: IProduct;
  quantity: number;
  price: number;
  variantId?: string;
  variantDetails?: {
    size: string;
    color: string;
  };
}

export interface ICart {
  _id: string;
  user: string;
  items: ICartItem[];
  subtotal: number;
  itemCount: number;
}

export interface IAddToCartData {
  productId: string;
  quantity: number;
  variantId?: string;
  variantDetails?: {
    size: string;
    color: string;
  };
}

// ============================================
// Order Types
// ============================================

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded";

export type PaymentMethod = "cod" | "esewa" | "khalti";

export interface IShippingAddress {
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
}

export interface IOrderItem {
  product: string | IProduct;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  variantId?: string;
  variant?: {
    size: string;
    color: string;
  };
}

export interface IOrder {
  _id: string;
  orderNumber: string;
  user: string | IUser;
  items: IOrderItem[];
  shippingAddress: IShippingAddress;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  subtotal: number;
  shippingCost: number;
  total: number;
  note?: string;
  statusHistory?: {
    status: OrderStatus;
    note?: string;
    timestamp: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface ICreateOrderData {
  shippingAddress: IShippingAddress;
  paymentMethod: PaymentMethod;
  note?: string;
}

// ============================================
// Payment Types
// ============================================

export interface IPaymentMethod {
  id: PaymentMethod;
  name: string;
  description: string;
  isEnabled: boolean;
}

export interface IPaymentInitiateResponse {
  success: boolean;
  gateway: PaymentMethod;
  paymentUrl?: string;
  data?: Record<string, unknown>;
}

export interface IPaymentVerifyData {
  orderId: string;
  gateway: PaymentMethod;
  callbackData: Record<string, unknown>;
}

// ============================================
// Admin Types
// ============================================

export interface IDashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  totalCustomers: number;
  recentOrders: IOrder[];
  topProducts: IProduct[];
}

export interface IAnalytics {
  period: string;
  revenue: number[];
  orders: number[];
  labels: string[];
}

// ============================================
// Review Types
// ============================================

export interface IReview {
  _id: string;
  user: string | IUser;
  product: string | IProduct;
  rating: number;
  comment?: string;
  createdAt: string;
  updatedAt: string;
}
