/**
 * Redux Store Configuration
 * Combines all slices and configures the store
 */
import { configureStore } from "@reduxjs/toolkit";
import cartReducer from "./cartSlice";
import chatReducer from "./chatSlice";

export const store = configureStore({
  reducer: {
    cart: cartReducer,
    chat: chatReducer,
  },
  devTools: import.meta.env.DEV,
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
