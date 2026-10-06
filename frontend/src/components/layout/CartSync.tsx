/**
 * Keeps the Redux cart in sync with the signed-in user: loads it on sign-in and
 * on every full page load (e.g. coming back from a payment gateway), clears it on sign-out.
 */
import { useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useAppDispatch } from "../../store/hooks";
import { fetchCart, resetCart } from "../../store/cartSlice";

const CartSync = (): null => {
  const { isAuthenticated, loading } = useAuth();
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (loading) return;
    if (isAuthenticated) {
      dispatch(fetchCart());
    } else {
      dispatch(resetCart());
    }
  }, [isAuthenticated, loading, dispatch]);

  return null;
};

export default CartSync;
