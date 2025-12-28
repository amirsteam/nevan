import api from './axios';

export const authAPI = {
    register: async (data) => {
        const response = await api.post('/auth/register', data);
        return response.data;
    },

    login: async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    },

    logout: async () => {
        const response = await api.post('/auth/logout');
        return response.data;
    },

    refreshToken: async (refreshToken) => {
        const response = await api.post('/auth/refresh-token', { refreshToken });
        return response.data;
    },

    getMe: async () => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    changePassword: async (currentPassword, newPassword) => {
        const response = await api.put('/auth/change-password', {
            currentPassword,
            newPassword,
        });
        return response.data;
    },
};

export default authAPI;
