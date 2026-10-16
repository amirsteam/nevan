/**
 * Admin API Module
 * Handles all admin-related API calls
 */
import api from "./axios";
import type { AxiosResponse } from "axios";
import type {
  IAdminLogEntry,
  IShippingSettings,
  OrderQueue,
  IApiResponse,
  IProduct,
  ICategory,
  IOrder,
  IUser,
  IDashboardStats,
  ILiveVisitors,
  IVisitorStats,
  IVisitTimeline,
  VisitorRange,
  OrderStatus,
  IAdminBadges,
  IBulkStatusResult,
  IContactMessage,
  ISubscriber,
  IAdminCampaign,
  ICampaignPresets,
  ICampaignStats,
} from "../types";

// Types
interface ProductQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sort?: string;
  isActive?: boolean;
  // "low" = 1..LOW_STOCK_THRESHOLD, "out" = 0
  stock?: "low" | "out";
}

interface OrderQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  // Cancelled orders that were paid online (money to return)
  refundRequired?: boolean;
  search?: string;
  // Work queue (dashboard cards): confirm | awaiting | ship | collect
  queue?: OrderQueue;
  // Placed between these Nepal dates (YYYY-MM-DD, both included)
  from?: string;
  to?: string;
}

interface UserQueryParams {
  page?: number;
  limit?: number;
  role?: string;
  isActive?: boolean;
  search?: string;
}

type ApiResponse<T> = Promise<AxiosResponse<IApiResponse<T>>>;

// Build a query string, skipping empty values
const toQueryString = (params: object): string =>
  new URLSearchParams(
    Object.entries(params)
      .filter(([, value]) => value !== undefined && value !== null && value !== "")
      .map(([key, value]) => [key, String(value)]),
  ).toString();

/**
 * Dashboard APIs
 */
export const getDashboard = (): ApiResponse<IDashboardStats> =>
  api.get("/admin/dashboard");

/**
 * Visitor analytics (website visits; /admin/visitors)
 */
export const getVisitorStats = (range: VisitorRange = "7d"): ApiResponse<IVisitorStats> =>
  api.get(`/admin/analytics?range=${range}`);

/** Online now, today's visitors and the latest visits */
export const getLiveVisitors = (): ApiResponse<ILiveVisitors> => api.get("/admin/analytics/live");

export const getVisitTimeline = (session: string): ApiResponse<{ visit: IVisitTimeline }> =>
  api.get(`/admin/analytics/sessions/${encodeURIComponent(session)}`);

/**
 * Products APIs
 */
export const getProducts = (
  params: ProductQueryParams = {},
): ApiResponse<{ products: IProduct[] }> => {
  const queryString = toQueryString(params);
  return api.get(`/admin/products?${queryString}`);
};

export const getProductById = (
  id: string,
): ApiResponse<{ product: IProduct }> => api.get(`/admin/products/${id}`);

// Size choices for the product form: built-in sizes plus custom sizes already in use
export const getProductSizeOptions = (): ApiResponse<{
  sizes: { builtIn: string[]; custom: string[] };
}> => api.get("/admin/products/sizes");

// Size and colour choices for the product editor
export const getProductOptions = (): ApiResponse<{
  sizes: { builtIn: string[]; custom: string[] };
  colors: { palette: { name: string; hex: string }[]; used: { name: string; hex?: string }[] };
}> => api.get("/admin/products/options");

// Product create/update bodies (see backend docs/openapi.ts); variants,
// photo order (`images`) and option lists differ from the IProduct read shape
export type ProductWriteBody = Record<string, unknown>;

export const createProduct = (
  data: ProductWriteBody | Partial<IProduct>,
): ApiResponse<{ product: IProduct }> => api.post("/admin/products", data);

export const updateProduct = (
  id: string,
  data: ProductWriteBody | Partial<IProduct>,
): ApiResponse<{ product: IProduct }> => api.put(`/admin/products/${id}`, data);

/** Products that were ordered are hidden (archived) instead, keeping their photos */
export const deleteProduct = (id: string): ApiResponse<{ archived: boolean }> =>
  api.delete(`/admin/products/${id}`);

export const uploadProductImages = (
  id: string,
  formData: FormData,
): ApiResponse<{ product: IProduct }> =>
  api.post(`/admin/products/${id}/images`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteProductImage = (
  productId: string,
  imageId: string,
): ApiResponse<{ product: IProduct }> =>
  api.delete(`/admin/products/${productId}/images/${imageId}`);

export const uploadVariantImage = (
  productId: string,
  variantId: string,
  formData: FormData,
): ApiResponse<{ product: IProduct }> =>
  api.post(
    `/admin/products/${productId}/variants/${variantId}/image`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    },
  );

/**
 * Categories APIs
 */
export const getCategories = (): ApiResponse<{ categories: ICategory[] }> =>
  api.get("/admin/categories");

export const getCategoryById = (
  id: string,
): ApiResponse<{ category: ICategory }> => api.get(`/categories/${id}`);

export const createCategory = (
  data: Partial<ICategory>,
): ApiResponse<{ category: ICategory }> => api.post("/admin/categories", data);

export const updateCategory = (
  id: string,
  data: Partial<ICategory>,
): ApiResponse<{ category: ICategory }> =>
  api.put(`/admin/categories/${id}`, data);

export const deleteCategory = (id: string): ApiResponse<null> =>
  api.delete(`/admin/categories/${id}`);

export const uploadCategoryImage = (
  id: string,
  formData: FormData,
): ApiResponse<{ category: ICategory }> =>
  api.post(`/admin/categories/${id}/image`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

/**
 * Orders APIs
 */
export const getOrders = (
  params: OrderQueryParams = {},
): ApiResponse<{ orders: IOrder[] }> => {
  const queryString = toQueryString(params);
  return api.get(`/admin/orders?${queryString}`);
};

export const getOrderById = (id: string): ApiResponse<{ order: IOrder }> =>
  api.get(`/admin/orders/${id}`);

export const updateOrderStatus = (
  id: string,
  status: OrderStatus,
  note: string = "",
): ApiResponse<{ order: IOrder }> =>
  api.put(`/admin/orders/${id}/status`, { status, note });

// Applies the same rules as single updates to each order; returns per-order results
export const bulkUpdateOrderStatus = (
  orderIds: string[],
  status: OrderStatus,
  note: string = "",
): ApiResponse<IBulkStatusResult> =>
  api.post("/admin/orders/bulk-status", { orderIds, status, note });

export const markCODCollected = (
  orderId: string,
): ApiResponse<{ order: IOrder }> =>
  api.post("/admin/payments/cod-collected", { orderId });

/** Every order matching the filters (not just one page), for CSV export */
export const exportOrders = (params: Omit<OrderQueryParams, "page" | "limit"> = {}): ApiResponse<{ orders: IOrder[] }> =>
  api.get("/admin/orders/export", { params });

/** Internal note on an order (admins only) */
export const updateOrderNote = (orderId: string, note: string): ApiResponse<{ order: IOrder }> =>
  api.put(`/admin/orders/${orderId}/note`, { note });

/** Record that the money owed on an order was given back */
export const recordRefund = (
  orderId: string,
  details: { reference?: string; note?: string },
): ApiResponse<{ order: IOrder }> => api.post(`/admin/orders/${orderId}/refund`, details);

/**
 * Users APIs
 */
export const getUsers = (
  params: UserQueryParams = {},
): ApiResponse<{ users: IUser[] }> => {
  const queryString = toQueryString(params);
  return api.get(`/admin/users?${queryString}`);
};

export const updateUserStatus = (
  id: string,
  isActive: boolean,
): ApiResponse<{ user: IUser }> =>
  api.put(`/admin/users/${id}/status`, { isActive });

export const updateUserRole = (
  id: string,
  role: "customer" | "admin",
): ApiResponse<{ user: IUser }> => api.put(`/admin/users/${id}/role`, { role });

/**
 * Contact messages and newsletter subscribers
 */
export const getContactMessages = (
  params: { page?: number; limit?: number; unread?: boolean } = {},
): ApiResponse<{ messages: IContactMessage[]; unreadCount: number }> =>
  api.get(`/admin/contact-messages?${toQueryString(params)}`);

export const setContactMessageRead = (
  id: string,
  isRead: boolean,
): ApiResponse<{ message: IContactMessage }> =>
  api.put(`/admin/contact-messages/${id}`, { isRead });

export const getSubscribers = (
  params: { page?: number; limit?: number } = {},
): ApiResponse<{ subscribers: ISubscriber[] }> =>
  api.get(`/admin/subscribers?${toQueryString(params)}`);

/**
 * Festival/event campaigns
 */
export type CampaignPayload = Partial<
  Pick<
    IAdminCampaign,
    "name" | "festival" | "headline" | "subheadline" | "greeting" | "emoji" | "palette" | "ctaLabel" | "showPopup" | "startsAt" | "endsAt" | "status"
  >
> & {
  sale?: Partial<IAdminCampaign["sale"]>;
  notify?: { pushOnLaunch?: boolean };
};

export const getCampaignPresets = (): ApiResponse<ICampaignPresets> => api.get("/admin/campaigns/presets");

export const getCampaigns = (): ApiResponse<{ campaigns: IAdminCampaign[] }> => api.get("/admin/campaigns");

export const getCampaign = (id: string): ApiResponse<{ campaign: IAdminCampaign }> =>
  api.get(`/admin/campaigns/${id}`);

export const createCampaign = (data: CampaignPayload): ApiResponse<{ campaign: IAdminCampaign }> =>
  api.post("/admin/campaigns", data);

export const updateCampaign = (id: string, data: CampaignPayload): ApiResponse<{ campaign: IAdminCampaign }> =>
  api.put(`/admin/campaigns/${id}`, data);

export const deleteCampaign = (id: string): ApiResponse<null> => api.delete(`/admin/campaigns/${id}`);

export const duplicateCampaign = (id: string): ApiResponse<{ campaign: IAdminCampaign }> =>
  api.post(`/admin/campaigns/${id}/duplicate`);

export const uploadCampaignBanner = (
  id: string,
  variant: "desktop" | "mobile",
  formData: FormData,
): ApiResponse<{ campaign: IAdminCampaign }> =>
  api.post(`/admin/campaigns/${id}/banner?variant=${variant}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

export const deleteCampaignBanner = (id: string, variant: "desktop" | "mobile"): ApiResponse<{ campaign: IAdminCampaign }> =>
  api.delete(`/admin/campaigns/${id}/banner?variant=${variant}`);

export const notifyCampaign = (id: string): ApiResponse<{ campaign: IAdminCampaign }> =>
  api.post(`/admin/campaigns/${id}/notify`);

export const getCampaignStats = (id: string): ApiResponse<{ stats: ICampaignStats }> =>
  api.get(`/admin/campaigns/${id}/stats`);

/** Admin activity log, newest first */
export const getActivity = (params: { page?: number; limit?: number } = {}): ApiResponse<{ entries: IAdminLogEntry[] }> =>
  api.get("/admin/activity", { params });

/** Shipping rates and free-delivery areas */
export const getShippingSettings = (): ApiResponse<{ settings: IShippingSettings }> => api.get("/admin/shipping");

export const updateShippingSettings = (
  settings: Pick<IShippingSettings, "freeShippingThreshold" | "valleyRate" | "provinceRates" | "freeAreas">,
): ApiResponse<{ settings: IShippingSettings }> => api.put("/admin/shipping", settings);

/** Counts for the admin navigation badges (cheap; polled by AdminLayout) */
export const getBadges = (): ApiResponse<IAdminBadges> => api.get("/admin/badges");

// Export as a grouped object for convenience
export const adminAPI = {
  // Dashboard
  getDashboard,
  getVisitorStats,
  getLiveVisitors,
  getVisitTimeline,
  getBadges,
  // Products
  getProducts,
  getProductById,
  getProductSizeOptions,
  getProductOptions,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  deleteProductImage,
  uploadVariantImage,
  // Categories
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadCategoryImage,
  // Orders
  getOrders,
  getOrderById,
  updateOrderStatus,
  bulkUpdateOrderStatus,
  markCODCollected,
  recordRefund,
  exportOrders,
  updateOrderNote,
  // Users
  getUsers,
  updateUserStatus,
  updateUserRole,
  // Campaigns
  getCampaignPresets,
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  duplicateCampaign,
  uploadCampaignBanner,
  deleteCampaignBanner,
  notifyCampaign,
  getCampaignStats,
  // Activity
  getActivity,
  // Shipping
  getShippingSettings,
  updateShippingSettings,
  // Contact
  getContactMessages,
  setContactMessageRead,
  getSubscribers,
};

export default adminAPI;
