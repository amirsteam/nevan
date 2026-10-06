/**
 * Wishlist state shared by every product card, the product page and the
 * header: one fetch per signed-in user, optimistic toggles.
 */
import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { wishlistAPI } from "../api/wishlist";
import { useAuth } from "../context/AuthContext";

interface WishlistState {
  ids: ReadonlySet<string>;
  loadedFor: string | null;
}

let state: WishlistState = { ids: new Set(), loadedFor: null };
let loadingFor: string | null = null;
const listeners = new Set<() => void>();

const setState = (next: Partial<WishlistState>) => {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

const getSnapshot = () => state;

const load = async (userId: string) => {
  if (loadingFor === userId || state.loadedFor === userId) return;
  loadingFor = userId;
  try {
    const res = await wishlistAPI.getWishlist();
    const items: Array<{ _id?: string } | string> = res?.data?.wishlist || [];
    const ids = new Set(items.map((item) => (typeof item === "string" ? item : String(item?._id))));
    setState({ ids, loadedFor: userId });
  } catch {
    // Leave empty; toggles still work and will correct the state
    setState({ loadedFor: userId });
  } finally {
    loadingFor = null;
  }
};

export const useWishlist = () => {
  const { isAuthenticated, user } = useAuth();
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const navigate = useNavigate();
  const location = useLocation();
  const userId = user?._id ?? null;

  useEffect(() => {
    if (isAuthenticated && userId) {
      load(userId);
    } else if (!isAuthenticated && state.loadedFor) {
      setState({ ids: new Set(), loadedFor: null });
    }
  }, [isAuthenticated, userId]);

  const isWishlisted = useCallback((productId: string) => snapshot.ids.has(productId), [snapshot]);

  const toggle = useCallback(
    async (productId: string, productName?: string) => {
      if (!isAuthenticated) {
        toast("Sign in to save favourites", { icon: "♡" });
        navigate("/login", { state: { from: location } });
        return;
      }

      const wasSaved = state.ids.has(productId);
      const optimistic = new Set(state.ids);
      if (wasSaved) optimistic.delete(productId);
      else optimistic.add(productId);
      setState({ ids: optimistic });

      try {
        if (wasSaved) {
          await wishlistAPI.removeFromWishlist(productId);
          toast.success(productName ? `Removed ${productName} from your wishlist` : "Removed from wishlist");
        } else {
          await wishlistAPI.addToWishlist(productId);
          toast.success(productName ? `Saved ${productName} to your wishlist` : "Saved to wishlist");
        }
      } catch {
        const reverted = new Set(state.ids);
        if (wasSaved) reverted.add(productId);
        else reverted.delete(productId);
        setState({ ids: reverted });
        toast.error("Couldn't update your wishlist. Please try again.");
      }
    },
    [isAuthenticated, navigate, location],
  );

  return { isWishlisted, toggle, count: snapshot.ids.size };
};

export default useWishlist;
