/**
 * Admin API Module
 * Handles all admin-related API calls
 */
import api from './axios';

/**
 * Dashboard APIs
 */
export const getDashboard = () => api.get('/admin/dashboard');

export const getDashboardAnalytics = (period = '7d') =>
    api.get(`/admin/dashboard/analytics?period=${period}`);

/**
 * Products APIs
 */
export const getProducts = (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/admin/products?${queryString}`);
};

export const getProductById = (id) => api.get(`/admin/products/${id}`);

export const createProduct = (data) => api.post('/admin/products', data);

export const updateProduct = (id, data) =>
    api.put(`/admin/products/${id}`, data);

export const deleteProduct = (id) => api.delete(`/admin/products/${id}`);

export const uploadProductImages = (id, formData) =>
    api.post(`/admin/products/${id}/images`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

export const deleteProductImage = (productId, imageId) =>
    api.delete(`/admin/products/${productId}/images/${imageId}`);

/**
 * Categories APIs
 */
export const getCategories = () => api.get('/categories/all');

export const getCategoryById = (id) => api.get(`/categories/${id}`);

export const createCategory = (data) => api.post('/admin/categories', data);

export const updateCategory = (id, data) =>
    api.put(`/admin/categories/${id}`, data);

export const deleteCategory = (id) => api.delete(`/admin/categories/${id}`);

export const uploadCategoryImage = (id, formData) =>
    api.post(`/admin/categories/${id}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

/**
 * Orders APIs
 */
export const getOrders = (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/admin/orders?${queryString}`);
};

export const getOrderById = (id) => api.get(`/admin/orders/${id}`);

export const updateOrderStatus = (id, status, note = '') =>
    api.put(`/admin/orders/${id}/status`, { status, note });

export const markCODCollected = (orderId) =>
    api.post('/admin/payments/cod-collected', { orderId });

/**
 * Users APIs
 */
export const getUsers = (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return api.get(`/admin/users?${queryString}`);
};

export const updateUserStatus = (id, isActive) =>
    api.put(`/admin/users/${id}/status`, { isActive });

export const updateUserRole = (id, role) =>
    api.put(`/admin/users/${id}/role`, { role });

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
