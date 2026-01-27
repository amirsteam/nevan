/**
 * Cart Slice
 * Redux slice for shopping cart state management
 */
import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { cartAPI } from "../api";
import type { ICart, ICartItem } from "@shared/types";
import type { RootState } from "./index";

// Types
interface CartState {
  items: ICartItem[];
  subtotal: number;
  itemCount: number;
  loading: boolean;
  error: string | null;
}

interface AddToCartParams {
  productId: string;
  quantity: number;
  variantId?: string;
  variantDetails?: {
    size: string;
    color: string;
  };
}

interface UpdateCartItemParams {
  itemId: string;
  quantity: number;
}

// Async thunks
export const fetchCart = createAsyncThunk<ICart, void, { rejectValue: string }>(
  "cart/fetchCart",
  async (_, { rejectWithValue }) => {
    try {
      const response = await cartAPI.getCart();
      return response.data.cart;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch cart",
      );
    }
  },
);

export const addToCart = createAsyncThunk<
  ICart,
  AddToCartParams,
  { rejectValue: string }
>(
  "cart/addToCart",
  async (
    { productId, quantity, variantId, variantDetails },
    { rejectWithValue },
  ) => {
    try {
      const response = await cartAPI.addToCart(
        productId,
        quantity,
        variantId,
        variantDetails,
      );
      return response.data.cart;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message || "Failed to add to cart",
      );
    }
  },
);

export const updateCartItem = createAsyncThunk<
  ICart,
  UpdateCartItemParams,
  { rejectValue: string }
>("cart/updateCartItem", async ({ itemId, quantity }, { rejectWithValue }) => {
  try {
    const response = await cartAPI.updateCartItem(itemId, quantity);
    return response.data.cart;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    return rejectWithValue(
      err.response?.data?.message || "Failed to update cart",
    );
  }
});

export const removeFromCart = createAsyncThunk<
  ICart,
  string,
  { rejectValue: string }
>("cart/removeFromCart", async (itemId, { rejectWithValue }) => {
  try {
    const response = await cartAPI.removeFromCart(itemId);
    return response.data.cart;
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } };
    return rejectWithValue(
      err.response?.data?.message || "Failed to remove from cart",
    );
  }
});

export const clearCart = createAsyncThunk<ICart, void, { rejectValue: string }>(
  "cart/clearCart",
  async (_, { rejectWithValue }) => {
    try {
      const response = await cartAPI.clearCart();
      return response.data.cart;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message || "Failed to clear cart",
      );
    }
  },
);

const initialState: CartState = {
  items: [],
  subtotal: 0,
  itemCount: 0,
  loading: false,
  error: null,
};

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    resetCart: () => initialState,
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch cart
      .addCase(fetchCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCart.fulfilled, (state, action: PayloadAction<ICart>) => {
        state.loading = false;
        state.items = action.payload.items || [];
        state.subtotal = action.payload.subtotal || 0;
        state.itemCount = action.payload.itemCount || 0;
      })
      .addCase(fetchCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Failed to fetch cart";
      })
      // Add to cart
      .addCase(addToCart.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(addToCart.fulfilled, (state, action: PayloadAction<ICart>) => {
        state.loading = false;
        state.items = action.payload.items || [];
        state.subtotal = action.payload.subtotal || 0;
        state.itemCount = action.payload.itemCount || 0;
      })
      .addCase(addToCart.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Failed to add to cart";
      })
      // Update cart item
      .addCase(
        updateCartItem.fulfilled,
        (state, action: PayloadAction<ICart>) => {
          state.items = action.payload.items || [];
          state.subtotal = action.payload.subtotal || 0;
          state.itemCount = action.payload.itemCount || 0;
        },
      )
      // Remove from cart
      .addCase(
        removeFromCart.fulfilled,
        (state, action: PayloadAction<ICart>) => {
          state.items = action.payload.items || [];
          state.subtotal = action.payload.subtotal || 0;
          state.itemCount = action.payload.itemCount || 0;
        },
      )
      // Clear cart
      .addCase(clearCart.fulfilled, () => initialState);
  },
});

export const { resetCart, clearError } = cartSlice.actions;

// Selectors
export const selectCart = (state: RootState) => state.cart;
export const selectCartItems = (state: RootState) => state.cart.items;
export const selectCartTotal = (state: RootState) => state.cart.subtotal;
export const selectCartCount = (state: RootState) => state.cart.itemCount;
export const selectCartLoading = (state: RootState) => state.cart.loading;

export default cartSlice.reducer;
