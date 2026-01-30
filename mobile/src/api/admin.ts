/**
 * Admin API Module
 * Handles all admin-related API calls for mobile app
 */
import api from "./axios";
import type {
  IProduct,
  ICategory,
  IOrder,
  IUser,
  IDashboardStats,
  OrderStatus,
} from "@shared/types";

// Types
interface PaginationParams {
  page?: number;
  limit?: number;
}

interface ProductQueryParams extends PaginationParams {
  category?: string;
  search?: string;
  sort?: string;
}

interface OrderQueryParams extends PaginationParams {
  status?: string;
  search?: string;
}

interface UserQueryParams extends PaginationParams {
  role?: string;
  search?: string;
}

interface PaginatedResponse<T> {
  data: T;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Helper to build query string
const buildQueryString = (params: Record<string, any>): string => {
  const filtered = Object.entries(params)
    .filter(([_, value]) => value !== undefined && value !== "")
    .reduce((acc, [key, value]) => ({ ...acc, [key]: String(value) }), {});
  return new URLSearchParams(filtered).toString();
};

/**
 * Dashboard APIs
 */
export const getDashboard = async (): Promise<IDashboardStats> => {
  const response = await api.get("/admin/dashboard");
  return response.data.data;
};

/**
 * Products APIs
 */
export const getProducts = async (
  params: ProductQueryParams = {},
): Promise<PaginatedResponse<{ products: IProduct[] }>> => {
  const queryString = buildQueryString(params);
  const response = await api.get(`/admin/products?${queryString}`);
  return {
    data: { products: response.data.data.products },
    pagination: response.data.pagination,
  };
};

export const getProductById = async (id: string): Promise<IProduct> => {
  const response = await api.get(`/admin/products/${id}`);
  return response.data.data.product;
};

export const createProduct = async (
  data: Partial<IProduct>,
): Promise<IProduct> => {
  const response = await api.post("/admin/products", data);
  return response.data.data.product;
};

export const updateProduct = async (
  id: string,
  data: Partial<IProduct>,
): Promise<IProduct> => {
  const response = await api.put(`/admin/products/${id}`, data);
  return response.data.data.product;
};

export const deleteProduct = async (id: string): Promise<void> => {
  await api.delete(`/admin/products/${id}`);
};

/**
 * Upload product images
 * @param productId - Product ID
 * @param imageUris - Array of local image URIs
 */
export const uploadProductImages = async (
  productId: string,
  imageUris: string[],
): Promise<IProduct> => {
  const formData = new FormData();

  imageUris.forEach((uri, index) => {
    // Extract filename from URI
    const filename = uri.split("/").pop() || `image_${index}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("images", {
      uri,
      name: filename,
      type,
    } as any);
  });

  const response = await api.post(
    `/admin/products/${productId}/images`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data.data.product;
};

/**
 * Upload variant image
 * @param productId - Product ID
 * @param variantId - Variant ID
 * @param imageUri - Local image URI
 */
export const uploadVariantImage = async (
  productId: string,
  variantId: string,
  imageUri: string,
): Promise<IProduct> => {
  const formData = new FormData();

  const filename = imageUri.split("/").pop() || "variant_image.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("image", {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  const response = await api.post(
    `/admin/products/${productId}/variants/${variantId}/image`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data.data.product;
};

/**
 * Upload category image
 * @param categoryId - Category ID
 * @param imageUri - Local image URI
 */
export const uploadCategoryImage = async (
  categoryId: string,
  imageUri: string,
): Promise<ICategory> => {
  const formData = new FormData();

  const filename = imageUri.split("/").pop() || "category_image.jpg";
  const match = /\.(\w+)$/.exec(filename);
  const type = match ? `image/${match[1]}` : "image/jpeg";

  formData.append("image", {
    uri: imageUri,
    name: filename,
    type,
  } as any);

  const response = await api.post(
    `/admin/categories/${categoryId}/image`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
  return response.data.data.category;
};

/**
 * Categories APIs
 */
export const getCategories = async (): Promise<ICategory[]> => {
  const response = await api.get("/admin/categories");
  return response.data.data.categories;
};

export const createCategory = async (
  data: Partial<ICategory>,
): Promise<ICategory> => {
  const response = await api.post("/admin/categories", data);
  return response.data.data.category;
};

export const updateCategory = async (
  id: string,
  data: Partial<ICategory>,
): Promise<ICategory> => {
  const response = await api.put(`/admin/categories/${id}`, data);
  return response.data.data.category;
};

export const deleteCategory = async (id: string): Promise<void> => {
  await api.delete(`/admin/categories/${id}`);
};

/**
 * Orders APIs
 */
export const getOrders = async (
  params: OrderQueryParams = {},
): Promise<PaginatedResponse<{ orders: IOrder[] }>> => {
  const queryString = buildQueryString(params);
  const response = await api.get(`/admin/orders?${queryString}`);
  return {
    data: { orders: response.data.data.orders },
    pagination: response.data.pagination,
  };
};

export const getOrderById = async (id: string): Promise<IOrder> => {
  const response = await api.get(`/admin/orders/${id}`);
  return response.data.data.order;
};

export const updateOrderStatus = async (
  id: string,
  status: OrderStatus,
  note: string = "",
): Promise<IOrder> => {
  const response = await api.put(`/admin/orders/${id}/status`, {
    status,
    note,
  });
  return response.data.data.order;
};

export const markCODCollected = async (
  orderId: string,
): Promise<{ success: boolean; message: string }> => {
  const response = await api.post("/admin/payments/cod-collected", { orderId });
  return {
    success: response.data.data?.success ?? true,
    message: response.data.message || "Payment marked as collected",
  };
};

/**
 * Users APIs
 */
export const getUsers = async (
  params: UserQueryParams = {},
): Promise<PaginatedResponse<{ users: IUser[] }>> => {
  const queryString = buildQueryString(params);
  const response = await api.get(`/admin/users?${queryString}`);
  return {
    data: { users: response.data.data.users },
    pagination: response.data.pagination,
  };
};

export const updateUserStatus = async (
  id: string,
  isActive: boolean,
): Promise<IUser> => {
  const response = await api.put(`/admin/users/${id}/status`, { isActive });
  return response.data.data.user;
};

export const updateUserRole = async (
  id: string,
  role: "customer" | "admin",
): Promise<IUser> => {
  const response = await api.put(`/admin/users/${id}/role`, { role });
  return response.data.data.user;
};

// Export as a grouped object for convenience
export const adminAPI = {
  // Dashboard
  getDashboard,
  // Products
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  uploadProductImages,
  uploadVariantImage,
  // Categories
  getCategories,
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
