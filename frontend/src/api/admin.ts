/**
 * Admin API Module
 * Handles all admin-related API calls
 */
import api from "./axios";
import type { AxiosResponse } from "axios";
import type {
  IApiResponse,
  IProduct,
  ICategory,
  IOrder,
  IUser,
  IDashboardStats,
  IAnalytics,
  OrderStatus,
} from "@shared/types";

// Types
interface ProductQueryParams {
  page?: number;
  limit?: number;
  category?: string;
  search?: string;
  sort?: string;
}

interface OrderQueryParams {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
}

interface UserQueryParams {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}

type ApiResponse<T> = Promise<AxiosResponse<IApiResponse<T>>>;

/**
 * Dashboard APIs
 */
export const getDashboard = (): ApiResponse<IDashboardStats> =>
  api.get("/admin/dashboard");

export const getDashboardAnalytics = (
  period: string = "7d",
): ApiResponse<IAnalytics> =>
  api.get(`/admin/dashboard/analytics?period=${period}`);

/**
 * Products APIs
 */
export const getProducts = (
  params: ProductQueryParams = {},
): ApiResponse<{
  products: IProduct[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  const queryString = new URLSearchParams(
    params as Record<string, string>,
  ).toString();
  return api.get(`/admin/products?${queryString}`);
};

export const getProductById = (
  id: string,
): ApiResponse<{ product: IProduct }> => api.get(`/admin/products/${id}`);

export const createProduct = (
  data: Partial<IProduct>,
): ApiResponse<{ product: IProduct }> => api.post("/admin/products", data);

export const updateProduct = (
  id: string,
  data: Partial<IProduct>,
): ApiResponse<{ product: IProduct }> => api.put(`/admin/products/${id}`, data);

export const deleteProduct = (id: string): ApiResponse<null> =>
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
): ApiResponse<{
  orders: IOrder[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  const queryString = new URLSearchParams(
    params as Record<string, string>,
  ).toString();
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

export const markCODCollected = (
  orderId: string,
): ApiResponse<{ order: IOrder }> =>
  api.post("/admin/payments/cod-collected", { orderId });

/**
 * Users APIs
 */
export const getUsers = (
  params: UserQueryParams = {},
): ApiResponse<{
  users: IUser[];
  pagination: { page: number; limit: number; total: number; pages: number };
}> => {
  const queryString = new URLSearchParams(
    params as Record<string, string>,
  ).toString();
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

// Export as a grouped object for convenience
export const adminAPI = {
  // Dashboard
  getDashboard,
  getDashboardAnalytics,
  // Products
  getProducts,
  getProductById,
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
  markCODCollected,
  // Users
  getUsers,
  updateUserStatus,
  updateUserRole,
};

export default adminAPI;
