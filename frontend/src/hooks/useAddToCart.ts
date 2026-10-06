/**
 * Add to cart from anywhere (product page, quick-add on cards).
 * Signed-out shoppers get the sign-in prompt; PendingCartSync adds the item
 * once they've signed in.
 */
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { addToCart } from "../store/cartSlice";
import { useAppDispatch } from "../store/hooks";
import { useAuth } from "../context/AuthContext";
import { usePendingCart } from "../context/PendingCartContext";
import { PLACEHOLDER_IMAGE } from "../utils/image";

export interface AddToCartInput {
  productId: string;
  productName: string;
  productImage?: string;
  price: number;
  quantity?: number;
  variant?: { _id: string; size: string; color: string; image?: string };
}

export const useAddToCart = () => {
  const dispatch = useAppDispatch();
  const { isAuthenticated } = useAuth();
  const { setPendingItem } = usePendingCart();
  const [addingId, setAddingId] = useState<string | null>(null);

  const add = useCallback(
    async (input: AddToCartInput): Promise<boolean> => {
      const quantity = input.quantity ?? 1;

      if (!isAuthenticated) {
        setPendingItem({
          productId: input.productId,
          productName: input.productName,
          productImage: input.variant?.image || input.productImage || PLACEHOLDER_IMAGE,
          productPrice: input.price,
          quantity,
          variantId: input.variant?._id,
          variantDetails: input.variant
            ? { size: input.variant.size, color: input.variant.color, image: input.variant.image }
            : undefined,
        });
        return false;
      }

      setAddingId(input.productId);
      try {
        await dispatch(
          addToCart({
            productId: input.productId,
            quantity,
            variantId: input.variant?._id,
            variantDetails: input.variant ? { size: input.variant.size, color: input.variant.color } : undefined,
          }),
        ).unwrap();
        toast.success(`${input.productName} added to cart`);
        return true;
      } catch (error) {
        toast.error(typeof error === "string" ? error : "Couldn't add to cart. Please try again.");
        return false;
      } finally {
        setAddingId(null);
      }
    },
    [dispatch, isAuthenticated, setPendingItem],
  );

  return { add, addingId };
};

export default useAddToCart;
