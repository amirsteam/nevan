/**
 * Orders API Endpoints
 * RTK Query endpoints for orders and payments
 */
import { baseApi } from "./baseApi";
import type {
  IApiResponse,
  IOrder,
  ICreateOrderData,
  IPaymentMethod,
  IPaymentInitiateResponse,
  PaymentMethod,
} from "@shared/types";

interface OrderQueryParams {
  page?: number;
  limit?: number;
  status?: string;
}

interface OrdersResponse {
  orders: IOrder[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export const ordersApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Get user's orders
    getMyOrders: builder.query<OrdersResponse, OrderQueryParams | void>({
      query: (params) => ({
        url: "/orders",
        params: params || {},
      }),
      transformResponse: (response: IApiResponse<OrdersResponse>) =>
        response.data,
      providesTags: (result) =>
        result
          ? [
              ...result.orders.map(({ _id }) => ({
                type: "Order" as const,
                id: _id,
              })),
              { type: "Orders", id: "LIST" },
            ]
          : [{ type: "Orders", id: "LIST" }],
    }),

    // Get single order
    getOrder: builder.query<IOrder, string>({
      query: (orderId) => `/orders/${orderId}`,
      transformResponse: (response: IApiResponse<{ order: IOrder }>) =>
        response.data.order,
      providesTags: (result, error, id) => [{ type: "Order", id }],
    }),

    // Create order
    createOrder: builder.mutation<{ order: IOrder }, ICreateOrderData>({
      query: (orderData) => ({
        url: "/orders",
        method: "POST",
        body: orderData,
      }),
      transformResponse: (response: IApiResponse<{ order: IOrder }>) =>
        response.data,
      invalidatesTags: [{ type: "Orders", id: "LIST" }, { type: "Cart" }],
    }),

    // Cancel order
    cancelOrder: builder.mutation<
      { order: IOrder },
      { orderId: string; reason?: string }
    >({
      query: ({ orderId, reason }) => ({
        url: `/orders/${orderId}/cancel`,
        method: "POST",
        body: { reason },
      }),
      transformResponse: (response: IApiResponse<{ order: IOrder }>) =>
        response.data,
      invalidatesTags: (result, error, { orderId }) => [
        { type: "Order", id: orderId },
        { type: "Orders", id: "LIST" },
      ],
    }),

    // Get payment methods
    getPaymentMethods: builder.query<IPaymentMethod[], void>({
      query: () => "/payments/methods",
      transformResponse: (
        response: IApiResponse<{ methods: IPaymentMethod[] }>,
      ) => response.data.methods,
    }),

    // Initiate payment
    initiatePayment: builder.mutation<
      IPaymentInitiateResponse,
      { orderId: string; gateway: PaymentMethod }
    >({
      query: ({ orderId, gateway }) => ({
        url: "/payments/initiate",
        method: "POST",
        body: { orderId, gateway },
      }),
    }),

    // Verify payment
    verifyPayment: builder.mutation<
      { order: IOrder },
      {
        orderId: string;
        gateway: PaymentMethod;
        callbackData: Record<string, unknown>;
      }
    >({
      query: ({ orderId, gateway, callbackData }) => ({
        url: "/payments/verify",
        method: "POST",
        body: { orderId, gateway, ...callbackData },
      }),
      transformResponse: (response: IApiResponse<{ order: IOrder }>) =>
        response.data,
      invalidatesTags: (result, error, { orderId }) => [
        { type: "Order", id: orderId },
        { type: "Orders", id: "LIST" },
      ],
    }),
  }),
  overrideExisting: false,
});

// Export hooks
export const {
  useGetMyOrdersQuery,
  useGetOrderQuery,
  useCreateOrderMutation,
  useCancelOrderMutation,
  useGetPaymentMethodsQuery,
  useInitiatePaymentMutation,
  useVerifyPaymentMutation,
  // Lazy queries
  useLazyGetMyOrdersQuery,
  useLazyGetOrderQuery,
} = ordersApi;
