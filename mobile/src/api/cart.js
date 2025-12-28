import api from './axios';

export const cartAPI = {
    getCart: async () => {
        const response = await api.get('/cart');
        return response.data;
    },

    addToCart: async (productId, quantity = 1, selectedVariants = []) => {
        const response = await api.post('/cart/items', {
            productId,
            quantity,
            selectedVariants,
        });
        return response.data;
    },

    updateCartItem: async (itemId, quantity) => {
        const response = await api.put(`/cart/items/${itemId}`, { quantity });
        return response.data;
    },

    removeFromCart: async (itemId) => {
        const response = await api.delete(`/cart/items/${itemId}`);
        return response.data;
    },

    clearCart: async () => {
        const response = await api.delete('/cart');
        return response.data;
    },
};

export default cartAPI;
