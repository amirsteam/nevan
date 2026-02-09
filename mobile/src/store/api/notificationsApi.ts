/**
 * Notifications API Endpoints (RTK Query)
 * In-app notification center API
 */
import { baseApi } from "./baseApi";

export interface INotification {
  _id: string;
  userId: string;
  type: "order_update" | "promotion" | "back_in_stock" | "chat_message" | "general";
  title: string;
  body: string;
  data?: Record<string, unknown>;
  isRead: boolean;
  readAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface NotificationsResponse {
  status: string;
  data: {
    notifications: INotification[];
    unreadCount: number;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

interface UnreadCountResponse {
  status: string;
  data: { unreadCount: number };
}

export const notificationsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getNotifications: builder.query<
      NotificationsResponse["data"] & NotificationsResponse["pagination"],
      { page?: number; limit?: number }
    >({
      query: ({ page = 1, limit = 20 }) =>
        `/notifications?page=${page}&limit=${limit}`,
      transformResponse: (response: NotificationsResponse) => ({
        ...response.data,
        ...response.pagination,
      }),
      providesTags: ["Notifications"],
    }),

    getUnreadCount: builder.query<number, void>({
      query: () => "/notifications/unread-count",
      transformResponse: (response: UnreadCountResponse) =>
        response.data.unreadCount,
      providesTags: ["NotificationCount"],
    }),

    markAsRead: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/${id}/read`,
        method: "PATCH",
      }),
      invalidatesTags: ["Notifications", "NotificationCount"],
    }),

    markAllAsRead: builder.mutation<void, void>({
      query: () => ({
        url: "/notifications/read-all",
        method: "PATCH",
      }),
      invalidatesTags: ["Notifications", "NotificationCount"],
    }),

    deleteNotification: builder.mutation<void, string>({
      query: (id) => ({
        url: `/notifications/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Notifications", "NotificationCount"],
    }),
  }),
});

export const {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
  useDeleteNotificationMutation,
} = notificationsApi;
