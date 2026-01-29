import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { ordersAPI } from "../api/orders";
import type { IOrder } from "@shared/types";

// Types
interface OrdersState {
  orders: IOrder[];
  currentOrder: IOrder | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  } | null;
  loading: boolean;
  error: string | null;
}

interface FetchOrdersParams {
  page?: number;
  limit?: number;
  status?: string;
}

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const initialState: OrdersState = {
  orders: [],
  currentOrder: null,
  pagination: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchOrders = createAsyncThunk<
  { orders: IOrder[]; pagination?: OrdersState["pagination"] },
  FetchOrdersParams | void,
  { rejectValue: string }
>("orders/fetchOrders", async (params, { rejectWithValue }) => {
  try {
    const response = await ordersAPI.getMyOrders(params || {});
    return {
      orders: response.data.orders,
      pagination: response.data.pagination,
    };
  } catch (error: unknown) {
    const err = error as ApiError;
    return rejectWithValue(
      err.response?.data?.message || "Failed to fetch orders",
    );
  }
});

export const fetchOrder = createAsyncThunk<
  IOrder,
  string,
  { rejectValue: string }
>("orders/fetchOrder", async (orderId, { rejectWithValue }) => {
  try {
    const response = await ordersAPI.getOrder(orderId);
    return response.data.order;
  } catch (error: unknown) {
    const err = error as ApiError;
    return rejectWithValue(
      err.response?.data?.message || "Failed to fetch order",
    );
  }
});

export const cancelOrder = createAsyncThunk<
  IOrder,
  { orderId: string; reason?: string },
  { rejectValue: string }
>("orders/cancelOrder", async ({ orderId, reason }, { rejectWithValue }) => {
  try {
    const response = await ordersAPI.cancelOrder(orderId, reason);
    return response.data.order;
  } catch (error: unknown) {
    const err = error as ApiError;
    return rejectWithValue(
      err.response?.data?.message || "Failed to cancel order",
    );
  }
});

// Slice
const ordersSlice = createSlice({
  name: "orders",
  initialState,
  reducers: {
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
    clearError: (state) => {
      state.error = null;
    },
    resetOrders: (state) => {
      state.orders = [];
      state.currentOrder = null;
      state.pagination = null;
      state.loading = false;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Orders
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.orders = action.payload.orders;
        state.pagination = action.payload.pagination || null;
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch orders";
      })
      // Fetch Single Order
      .addCase(fetchOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload;
      })
      .addCase(fetchOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to fetch order";
      })
      // Cancel Order
      .addCase(cancelOrder.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(cancelOrder.fulfilled, (state, action) => {
        state.loading = false;
        state.currentOrder = action.payload;
        // Update order in list
        const index = state.orders.findIndex(
          (o) => o._id === action.payload._id,
        );
        if (index !== -1) {
          state.orders[index] = action.payload;
        }
      })
      .addCase(cancelOrder.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload || "Failed to cancel order";
      });
  },
});

export const { clearCurrentOrder, clearError, resetOrders } =
  ordersSlice.actions;

export default ordersSlice.reducer;
