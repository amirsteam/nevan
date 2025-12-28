import api from './axios';

export const ordersAPI = {
    createOrder: async (orderData) => {
        const response = await api.post('/orders', orderData);
        return response.data;
    },

    getMyOrders: async (params = {}) => {
        const response = await api.get('/orders', { params });
        return response.data;
    },

    getOrder: async (orderId) => {
        const response = await api.get(`/orders/${orderId}`);
        return response.data;
    },

    cancelOrder: async (orderId, reason) => {
        const response = await api.post(`/orders/${orderId}/cancel`, { reason });
        return response.data;
    },
};

export const paymentsAPI = {
    getMethods: async () => {
        const response = await api.get('/payments/methods');
        return response.data;
    },

    initiatePayment: async (orderId, gateway) => {
        const response = await api.post('/payments/initiate', { orderId, gateway });
        return response.data;
    },

    verifyPayment: async (orderId, gateway, callbackData) => {
        const response = await api.post('/payments/verify', {
            orderId,
            gateway,
            callbackData,
        });
        return response.data;
    },
};

export default { ordersAPI, paymentsAPI };
