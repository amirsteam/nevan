/**
 * Orders API
 * API calls for order operations
 */
import api from "./axios";
import type {
  IApiResponse,
  IOrder,
  ICreateOrderData,
  IPaymentMethod,
  IPaymentInitiateResponse,
  PaymentMethod,
} from "../types";

interface OrderQueryParams {
  page?: number;
  limit?: number;
  status?: string;
}

export const ordersAPI = {
  createOrder: async (
    orderData: ICreateOrderData,
  ): Promise<IApiResponse<{ order: IOrder }>> => {
    const response = await api.post("/orders", orderData);
    return response.data;
  },

  getMyOrders: async (
    params: OrderQueryParams = {},
  ): Promise<
    IApiResponse<{
      orders: IOrder[];
      pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }>
  > => {
    const response = await api.get("/orders", { params });
    return response.data;
  },

  getOrder: async (
    orderId: string,
  ): Promise<IApiResponse<{ order: IOrder }>> => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
  },

  cancelOrder: async (
    orderId: string,
    reason?: string,
  ): Promise<IApiResponse<{ order: IOrder }>> => {
    const response = await api.post(`/orders/${orderId}/cancel`, { reason });
    return response.data;
  },
};

export const paymentsAPI = {
  getMethods: async (): Promise<
    IApiResponse<{ methods: IPaymentMethod[] }>
  > => {
    const response = await api.get("/payments/methods");
    return response.data;
  },

  initiatePayment: async (
    orderId: string,
    gateway: PaymentMethod,
  ): Promise<IPaymentInitiateResponse> => {
    const response = await api.post("/payments/initiate", { orderId, gateway });
    return response.data;
  },

  verifyPayment: async (
    orderId: string,
    gateway: PaymentMethod,
    callbackData: Record<string, unknown>,
  ): Promise<IApiResponse<{ order: IOrder }>> => {
    const response = await api.post("/payments/verify", {
      orderId,
      gateway,
      callbackData,
    });
    return response.data;
  },
};

export default { ordersAPI, paymentsAPI };
