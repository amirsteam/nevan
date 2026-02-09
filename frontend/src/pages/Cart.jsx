/**
 * Cart Page
 */
import { useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import {
  fetchCart,
  updateCartItem,
  removeFromCart,
  selectCart,
} from "../store/cartSlice";
import { formatPrice } from "../utils/helpers";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";

const Cart = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { items, subtotal, loading } = useSelector(selectCart);

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const handleUpdateQuantity = useCallback(
    async (itemId, newQuantity) => {
      if (newQuantity < 1) return;
      try {
        await dispatch(
          updateCartItem({ itemId, quantity: newQuantity }),
        ).unwrap();
      } catch (error) {
        toast.error(error || "Failed to update");
      }
    },
    [dispatch],
  );

  const handleRemove = useCallback(
    async (itemId) => {
      try {
        await dispatch(removeFromCart(itemId)).unwrap();
        toast.success("Item removed");
      } catch (error) {
        toast.error(error || "Failed to remove");
      }
    },
    [dispatch],
  );

  if (loading && items.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-app py-20 text-center">
        <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-[var(--color-text-muted)]" />
        <h1 className="text-2xl font-bold mb-2">Your Cart is Empty</h1>
        <p className="text-[var(--color-text-muted)] mb-6">
          Looks like you haven't added anything to your cart yet.
        </p>
        <Link to="/products" className="btn btn-primary">
          Start Shopping
        </Link>
      </div>
    );
  }

  return (
    <div className="container-app py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
        <Link to="/" className="hover:text-[var(--color-primary)] transition-colors">Home</Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">Cart</span>
      </nav>

      <h1 className="text-2xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <div key={item._id} className="card p-4 flex gap-4">
              <Link
                to={`/products/${item.product?.slug || item.product}`}
                className="flex-shrink-0"
              >
                <img
                  src={
                    item.variant?.image ||
                    item.product?.images?.[0]?.url ||
                    "/placeholder.jpg"
                  }
                  alt={item.name || item.product?.name}
                  className="w-24 h-24 object-cover rounded-lg"
                />
              </Link>

              <div className="flex-1 min-w-0">
                <Link
                  to={`/products/${item.product?.slug || item.product}`}
                  className="font-medium hover:text-[var(--color-primary)] line-clamp-1"
                >
                  {item.name || item.product?.name}
                </Link>

                {item.selectedVariants?.length > 0 && (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {item.selectedVariants
                      .map((v) => `${v.variantName}: ${v.optionValue}`)
                      .join(", ")}
                  </p>
                )}

                {item.variant && (
                  <p className="text-sm text-[var(--color-text-muted)]">
                    {item.variant.size} - {item.variant.color}
                  </p>
                )}

                <p className="font-bold text-[var(--color-primary)] mt-1">
                  {formatPrice(
                    item.currentPrice ||
                      item.priceSnapshot ||
                      item.product?.price,
                  )}
                </p>

                <div className="flex items-center gap-4 mt-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        handleUpdateQuantity(item._id, item.quantity - 1)
                      }
                      disabled={item.quantity <= 1}
                      className="w-8 h-8 rounded border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-bg)] disabled:opacity-50"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() =>
                        handleUpdateQuantity(item._id, item.quantity + 1)
                      }
                      className="w-8 h-8 rounded border border-[var(--color-border)] flex items-center justify-center hover:bg-[var(--color-bg)]"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => handleRemove(item._id)}
                    className="text-[var(--color-error)] hover:underline text-sm flex items-center gap-1"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </button>
                </div>
              </div>

              <div className="text-right">
                <p className="font-bold">
                  {formatPrice(
                    (item.currentPrice ||
                      item.priceSnapshot ||
                      item.product?.price) * item.quantity,
                  )}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="font-semibold text-lg mb-4">Order Summary</h2>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Shipping</span>
                <span className="text-[var(--color-success)]">
                  {subtotal >= 5000 ? "Free" : "Calculated at checkout"}
                </span>
              </div>
            </div>

            <div className="border-t border-[var(--color-border)] pt-4 mb-6">
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="text-[var(--color-primary)]">
                  {formatPrice(subtotal)}
                </span>
              </div>
            </div>

            <button
              onClick={() => navigate("/checkout")}
              className="btn btn-primary w-full py-3"
            >
              Proceed to Checkout
              <ArrowRight className="w-4 h-4" />
            </button>

            <Link to="/products" className="btn btn-secondary w-full mt-3">
              Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Cart;
