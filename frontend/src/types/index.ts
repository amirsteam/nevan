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
  // Product photos: the colour this photo shows (null/absent = every colour)
  color?: string | null;
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
  // false for accounts created with Google until a password is set via Forgot password
  hasPassword?: boolean;
  emailVerified?: boolean;
  googleLinked?: boolean;
  // Admins: two-step login (authenticator app) is set up
  twoFactorEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
  // GET /admin/users only: orders placed, spent (confirmed to delivered), last order
  orderStats?: { orders: number; spent: number; lastOrderAt: string | null };
}

// The refresh token is delivered to browsers as an httpOnly cookie, not in the body
export interface IAuthResponse {
  user: IUser;
  accessToken: string;
  // Google sign-in only
  isNewUser?: boolean;
  passwordRemoved?: boolean;
  // After two-step login: backup codes left, and the new codes right after setup (shown once)
  backupCodesLeft?: number;
  backupCodes?: string[];
}

/** Admin sign-in: password accepted, the authenticator step comes next (no tokens yet) */
export interface ITwoFactorPendingResponse {
  twoFactorRequired?: true;
  twoFactorSetupRequired?: true;
  challengeToken: string;
}

export interface ITwoFactorChallenge {
  purpose: "verify" | "setup";
  challengeToken: string;
}

/** A new authenticator to add: scan the QR code or type the key */
export interface ITwoFactorSetup {
  otpauthUrl: string;
  qrCode: string;
  manualKey: string;
}

export interface ITwoFactorStatus {
  enabled: boolean;
  enabledAt: string | null;
  backupCodesLeft: number;
  rememberedBrowsers: number;
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
  // Derived by the API: the first photo of this variant's colour
  image?: string | null;
  // Present while a campaign sale discounts this variant
  salePrice?: number;
}

/** A product colour with its swatch */
export interface IProductColor {
  name: string;
  hex?: string;
}

/** Campaign sale price on a product (set by the API while a campaign is live) */
export interface IProductSale {
  price: number;
  originalPrice: number;
  percentOff: number;
  campaign: { slug: string; name: string; endsAt: string };
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
  // Option lists in display order (products with variants)
  sizes?: string[];
  colors?: IProductColor[];
  sale?: IProductSale;
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
  // Price before a campaign sale (equal to currentPrice when not on sale)
  originalPrice?: number;
  onSale?: boolean;
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
  // Saved by campaign sale prices (already reflected in subtotal)
  savings?: number;
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
    // Paid twice: the extra payment is to be refunded
    refundRequired?: boolean;
    // Recorded by an admin once the money was given back
    refundedAt?: string;
    refundReference?: string;
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

/** GET /shipping/settings and /admin/shipping (admins edit them) */
export interface IShippingSettings {
  freeShippingThreshold: number;
  /** Kathmandu, Lalitpur and Bhaktapur districts */
  valleyRate: number;
  /** Province 1–7 -> NPR (outside the valley) */
  provinceRates: Record<number, number>;
  /** Districts (optionally one town in it) that ship free */
  freeAreas: { district: string; city?: string }[];
  valleyDistricts?: string[];
  updatedAt?: string | null;
}

/** POST /orders/shipping-quote: what placing the order will charge for shipping */
export interface IShippingQuote {
  subtotal: number;
  shippingCost: number;
  freeShippingThreshold: number;
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
  // Retry for an order an earlier attempt already paid: nothing to pay
  alreadyPaid?: boolean;
}

/** POST /payments/check-status: where an order's payment stands after asking the gateway */
export interface IPaymentStatusCheck {
  orderId: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  // The gateway is still confirming a payment: don't offer to pay again
  processing: boolean;
}

export interface IPaymentVerifyData {
  orderId: string;
  gateway: PaymentMethod;
  callbackData: Record<string, unknown>;
}

// ============================================
// Admin Types
// ============================================

// GET /admin/dashboard (backend/routes/adminRoutes.ts + Order.getDashboardStats)
export interface IPeriodTotals {
  /** Order totals, shipping included */
  sales: number;
  products: number;
  shipping: number;
  orders: number;
}

export interface IDashboardStats {
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  totalUsers: number;
  totalProducts: number;
  ordersByStatus: Partial<Record<OrderStatus, number>>;
  salesByDay: { date: string; revenue: number; orders: number }[];
  recentOrders: {
    _id: string;
    orderNumber: string;
    user?: Pick<IUser, "name" | "email"> | null;
    orderStatus: OrderStatus;
    paymentStatus?: PaymentStatus;
    total?: number;
    createdAt: string;
  }[];
  lowStockThreshold: number;
  lowStockCount: number;
  lowStockProducts: {
    _id: string;
    name: string;
    slug: string;
    stock: number;
    image?: string;
    lowVariants: { size: string; color: string; stock: number }[];
  }[];
  needsAttention: {
    toConfirm: number;
    awaitingPayment: number;
    toShip: number;
    cashToCollect: number;
    refundRequired: number;
    lowStock: number;
    soldOut: number;
    unreadMessages: number;
    /** All pending orders (older app versions) */
    pendingOrders: number;
  };
  /** Sales by Nepal-time period, each against the same length of time before */
  revenue: Record<"today" | "month" | "last30", { current: IPeriodTotals; previous: IPeriodTotals }>;
  /** COD orders on their way whose cash isn't collected yet */
  cashToCollect: { amount: number; orders: number };
  // Best sellers, last 30 days
  topProducts: {
    _id: string;
    name: string;
    slug?: string;
    image?: string;
    quantity: number;
    revenue: number;
  }[];
}

/** GET /admin/activity */
export interface IAdminLogEntry {
  _id: string;
  adminName: string;
  action: string;
  target: { type: string; id?: string; label?: string };
  details?: string;
  createdAt: string;
}

/** Admin order work queues (?queue= on the order list; dashboard cards) */
export type OrderQueue = "confirm" | "awaiting" | "ship" | "collect";

// GET /admin/badges
export interface IAdminBadges {
  /** COD orders to confirm (online orders confirm themselves once paid) */
  toConfirm: number;
  /** All pending orders, incl. online orders awaiting payment */
  pendingOrders: number;
  refundRequired: number;
  unreadMessages: number;
}

// POST /admin/orders/bulk-status
export interface IBulkStatusResult {
  updated: { _id: string; orderNumber: string }[];
  failed: { _id: string; orderNumber?: string; message: string }[];
}

// Storefront contact-form message (admin inbox)
export interface IContactMessage {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  subject?: string;
  message: string;
  isRead: boolean;
  emailed: boolean;
  createdAt: string;
}

export interface ISubscriber {
  _id: string;
  email: string;
  source: string;
  createdAt: string;
}

// ============================================
// Visitor analytics (admin Visitors page)
// ============================================

export type VisitorRange = "today" | "7d" | "30d" | "90d";
export type VisitDevice = "mobile" | "tablet" | "desktop";

export interface IVisitTotals {
  visitors: number;
  visits: number;
  pageViews: number;
  productViews: number;
  searches: number;
  addToCarts: number;
  checkouts: number;
  /** Website visitors who placed an order */
  orderingVisitors: number;
  /** All orders placed (website and app) */
  ordersPlaced: number;
  conversion: number;
}

export interface IVisitorStats {
  range: VisitorRange;
  from: string;
  to: string;
  granularity: "hour" | "day";
  /** Whether the period before is still within the kept records */
  comparable: boolean;
  retentionDays: number;
  totals: { current: IVisitTotals; previous: IVisitTotals };
  /** "HH" (today) or "YYYY-MM-DD" (Nepal days) */
  series: { key: string; visitors: number; productViews: number; orders: number }[];
  funnel: { step: string; label: string; visitors: number }[];
  sources: { source: string; visits: number; orders: number }[];
  devices: { device: VisitDevice; visits: number }[];
  hours: { hour: number; pageViews: number }[];
  topProducts: {
    _id: string;
    name: string;
    slug: string;
    image?: string;
    isActive: boolean;
    views: number;
    carts: number;
    orders: number;
    quantity: number;
    conversion: number;
    notSelling: boolean;
  }[];
  searches: {
    top: { query: string; searches: number; results: number | null }[];
    noResults: { query: string; searches: number }[];
  };
  topPages: { path: string; views: number }[];
}

export interface IVisitProduct {
  _id: string;
  name: string;
  slug: string;
  image?: string;
}

export interface IRecentVisit {
  session: string;
  /** Only when the shopper was signed in */
  name: string | null;
  visitorLabel: string;
  returning: boolean;
  device: VisitDevice;
  source: string;
  referrerHost: string | null;
  campaign: string | null;
  landingPath: string;
  startedAt: string;
  lastSeenAt: string;
  online: boolean;
  pageViews: number;
  productViews: number;
  addToCarts: number;
  ordered: boolean;
  productsViewed: number;
  products: IVisitProduct[];
}

export interface ILiveVisitors {
  onlineNow: number;
  todayVisitors: number;
  recent: IRecentVisit[];
}

export interface IVisitTimeline {
  session: string;
  name: string | null;
  visitorLabel: string;
  device: VisitDevice;
  source: string;
  referrerHost: string | null;
  campaign: string | null;
  startedAt: string;
  lastSeenAt: string;
  events: {
    type: "page_view" | "product_view" | "search" | "add_to_cart" | "checkout_start" | "order_placed";
    at: string;
    path: string;
    query: string | null;
    results: number | null;
    product: IVisitProduct | null;
    order: { _id: string; orderNumber: string; total: number | null } | null;
  }[];
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

// ============================================
// Campaign Types (festivals and events)
// ============================================

export type CampaignState = "draft" | "scheduled" | "live" | "ended";
export type CampaignSaleType = "none" | "percent" | "fixed";
export type CampaignSaleScope = "all" | "categories" | "products";

/** Colours resolved by the API from the campaign's palette (WCAG AA pairs) */
export interface ICampaignTheme {
  label: string;
  bg: string;
  text: string;
  accent: string;
  onAccent: string;
  highlight: string;
}

/** GET /campaigns/live and /campaigns/:slug */
export interface IPublicCampaign {
  _id: string;
  name: string;
  slug: string;
  festival: string;
  headline: string;
  subheadline: string;
  greeting: string;
  emoji: string;
  ctaLabel: string;
  // Show the sale popup to each visitor once while live (default true)
  showPopup?: boolean;
  bannerDesktop: string | null;
  bannerMobile: string | null;
  startsAt: string;
  endsAt: string;
  state: CampaignState;
  theme: ICampaignTheme;
  sale: {
    type: CampaignSaleType;
    value: number;
    scope: CampaignSaleScope;
    label: string | null;
    categories: { _id: string; name: string; slug: string }[];
  };
}

/** Admin campaign document */
export interface IAdminCampaign {
  _id: string;
  name: string;
  slug: string;
  festival: string;
  headline: string;
  subheadline?: string;
  greeting?: string;
  emoji?: string;
  palette: string;
  ctaLabel: string;
  // Show the sale popup to each visitor once while live (default true)
  showPopup?: boolean;
  bannerDesktop?: { url: string; publicId?: string } | null;
  bannerMobile?: { url: string; publicId?: string } | null;
  startsAt: string;
  endsAt: string;
  status: "draft" | "published";
  sale: {
    type: CampaignSaleType;
    value: number;
    scope: CampaignSaleScope;
    categories: string[];
    products: string[];
    excludeProducts: string[];
  };
  notify: { pushOnLaunch: boolean; sentAt?: string | null };
  state: CampaignState;
  theme: ICampaignTheme;
  saleLabel: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface IFestivalPreset {
  label: string;
  emoji: string;
  palette: string;
  name: string;
  headline: string;
  greeting: string;
  monthHint: string;
}

/** GET /admin/campaigns/presets */
export interface ICampaignPresets {
  festivals: Record<string, IFestivalPreset>;
  palettes: Record<string, ICampaignTheme>;
  maxPercent: number;
}

export interface ICampaignStats {
  orders: number;
  units: number;
  revenue: number;
  savings: number;
}
