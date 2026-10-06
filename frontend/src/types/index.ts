/**
 * Frontend Types
 * Local type definitions to avoid shared import issues in production builds
 */

// ============================================
// Common Types
// ============================================

export interface IImage {
  _id?: string;
  url: string;
  publicId: string;
  alt?: string;
  isPrimary?: boolean;
}

export interface IApiResponse<T> {
  status?: "success" | "fail" | "error";
  success?: boolean;
  message?: string;
  data: T;
  // List endpoints also return these next to `data`
  results?: number;
  pagination?: IPagination;
}

// Pagination block returned by list endpoints (backend utils/helpers.ts `paginate`)
export interface IPagination {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  totalItems: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface IPaginatedResponse<T> {
  success: boolean;
  data: T;
  pagination: IPagination;
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

// The refresh token is delivered to browsers as an httpOnly cookie, not in the body
export interface IAuthResponse {
  user: IUser;
  accessToken: string;
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
  parent?: ICategory | string | null;
  order?: number;
  isActive?: boolean;
  subcategories?: ICategory[];
  productCount?: number;
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
  comparePrice?: number;
  stock: number;
  image?: string;
}

export interface IProduct {
  _id: string;
  name: string;
  slug: string;
  sku?: string;
  description: string;
  shortDescription?: string;
  material?: string;
  careInstructions?: string;
  ageRecommendation?: string;
  // Storefront filters ("Shop by Age", gender); untagged products have none
  ageGroups?: string[];
  gender?: "boy" | "girl" | "unisex";
  price: number;
  comparePrice?: number;
  category: string | ICategory;
  images: IImage[];
  stock: number;
  ratings?: {
    average: number;
    count: number;
  };
  numReviews?: number;
  isFeatured?: boolean;
  isActive?: boolean;
  metaTitle?: string;
  metaDescription?: string;
  variants?: IProductVariant[];
  createdAt?: string;
  updatedAt?: string;
}

export interface IProductsResponse {
  products: IProduct[];
  pagination?: IPagination;
}

// ============================================
// Cart Types
// ============================================

// Shape returned by GET /cart (Cart.calculateTotal on the API)
export interface ICartItem {
  _id: string;
  product: IProduct;
  quantity: number;
  price?: number;
  priceAtAdd?: number;
  currentPrice?: number;
  itemTotal?: number;
  priceChanged?: boolean;
  variantId?: string | null;
  variant?: IProductVariant | null;
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

/** Saved delivery address (address book on the account, max 5) */
export interface ISavedAddress {
  _id: string;
  label?: string;
  name: string;
  phone: string;
  street: string;
  city: string;
  district: string;
  province: number;
  landmark?: string;
  isDefault: boolean;
}

export type ISavedAddressInput = Omit<ISavedAddress, "_id" | "isDefault"> & { isDefault?: boolean };

export interface IShippingAddress {
  fullName?: string;
  name?: string;
  phone: string;
  street: string;
  city: string;
  state?: string;
  district?: string;
  province?: number;
  postalCode?: string;
  country?: string;
  landmark?: string;
}

export interface IOrderItem {
  _id?: string;
  product: string | IProduct;
  name: string;
  slug?: string;
  price: number;
  quantity: number;
  image?: string;
  variantId?: string;
  variant?: {
    size: string;
    color: string;
  };
  variantDetails?: {
    size: string;
    color: string;
  };
  subtotal?: number;
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
  status?: OrderStatus;
  payment?: {
    method: PaymentMethod;
    status: PaymentStatus;
    transactionId?: string;
    paidAt?: string;
  };
  pricing?: {
    subtotal: number;
    shippingCost: number;
    discount: number;
    tax: number;
    total: number;
  };
  discount?: number;
  note?: string;
  notes?: string;
  customerNotes?: string;
  canBeCancelled?: boolean;
  cancellationReason?: string;
  statusHistory?: {
    status: OrderStatus;
    note?: string;
    timestamp?: string;
    changedAt?: string;
  }[];
  createdAt: string;
  updatedAt: string;
}

export interface ICreateOrderData {
  shippingAddress: Partial<IShippingAddress> & {
    phone: string;
    street: string;
    city: string;
  };
  paymentMethod: PaymentMethod;
  customerNotes?: string;
}

// ============================================
// Payment Types
// ============================================

// GET /payments/methods (PaymentService.getAvailableMethods)
export interface IPaymentMethod {
  id: PaymentMethod;
  name: string;
  description: string;
  icon?: string;
  enabled?: boolean;
}

// POST /payments/initiate `data` (PaymentService.initiatePayment)
export interface IPaymentInitiateResponse {
  success: boolean;
  transactionId?: string;
  status?: string;
  requiresRedirect?: boolean;
  redirectUrl?: string;
  // eSewa: fields to POST to redirectUrl
  formData?: Record<string, string | number>;
  method?: string;
  message?: string;
  pidx?: string;
  paymentId?: string;
  orderId?: string;
  orderNumber?: string;
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
  title?: string;
  comment?: string;
  isVerifiedPurchase?: boolean;
  createdAt: string;
  updatedAt: string;
}
