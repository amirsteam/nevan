/**
 * Adds the item a signed-out shopper tried to add (PendingCartContext) once
 * they have signed in, wherever they were (product page or a product card).
 */
import { useEffect, useRef } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../context/AuthContext";
import { usePendingCart } from "../../context/PendingCartContext";
import { addToCart } from "../../store/cartSlice";
import { useAppDispatch } from "../../store/hooks";

const PendingCartSync = (): null => {
  const { isAuthenticated } = useAuth();
  const { pendingItem, isModalOpen, clearPendingItem } = usePendingCart();
  const dispatch = useAppDispatch();
  const attempted = useRef<unknown>(null);

  useEffect(() => {
    if (!isAuthenticated || !pendingItem || isModalOpen || attempted.current === pendingItem) return;
    attempted.current = pendingItem;

    dispatch(
      addToCart({
        productId: pendingItem.productId,
        quantity: pendingItem.quantity,
        variantId: pendingItem.variantId || undefined,
        variantDetails: pendingItem.variantDetails
          ? { size: pendingItem.variantDetails.size, color: pendingItem.variantDetails.color }
          : undefined,
      }),
    )
      .unwrap()
      .then(() => toast.success(`${pendingItem.productName} added to cart`))
      .catch((error) => toast.error(typeof error === "string" ? error : "Couldn't add to cart"))
      .finally(() => clearPendingItem());
  }, [isAuthenticated, pendingItem, isModalOpen, dispatch, clearPendingItem]);

  return null;
};

export default PendingCartSync;
