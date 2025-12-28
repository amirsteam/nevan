import api from './axios';

export const productsAPI = {
    getProducts: async (params = {}) => {
        const response = await api.get('/products', { params });
        return response.data;
    },

    getFeatured: async (limit = 8) => {
        const response = await api.get('/products/featured', { params: { limit } });
        return response.data;
    },

    getProduct: async (slug) => {
        const response = await api.get(`/products/${slug}`);
        return response.data;
    },

    searchProducts: async (query, params = {}) => {
        const response = await api.get('/products', {
            params: { search: query, ...params },
        });
        return response.data;
    },
};

export const categoriesAPI = {
    getCategories: async () => {
        const response = await api.get('/categories');
        return response.data;
    },

    getCategory: async (slug) => {
        const response = await api.get(`/categories/${slug}`);
        return response.data;
    },

    getCategoryProducts: async (slug, params = {}) => {
        const response = await api.get('/products', {
            params: { category: slug, ...params },
        });
        return response.data;
    },
};

export default { productsAPI, categoriesAPI };
