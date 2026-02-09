/**
 * Notifications API
 * API calls for in-app notifications
 */
import api from "./axios";

export const notificationsAPI = {
  getNotifications: async (page = 1, limit = 20) => {
    const response = await api.get("/notifications", {
      params: { page, limit },
    });
    return response.data;
  },

  getUnreadCount: async () => {
    const response = await api.get("/notifications/unread-count");
    return response.data;
  },

  markAsRead: async (id) => {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data;
  },

  markAllAsRead: async () => {
    const response = await api.patch("/notifications/read-all");
    return response.data;
  },

  deleteNotification: async (id) => {
    const response = await api.delete(`/notifications/${id}`);
    return response.data;
  },
};

export default notificationsAPI;
