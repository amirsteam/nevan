/**
 * Cart Page
 * Line items with stock-aware quantities, free-shipping progress, and a
 * sticky checkout bar on phones
 */
import { useEffect, useCallback, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Trash2, ArrowRight, AlertTriangle, Lock } from "lucide-react";
import { fetchCart, updateCartItem, removeFromCart, selectCart } from "../store/cartSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { formatPrice } from "../utils/helpers";
import { imageUrl, onImageError } from "../utils/image";
import { FREE_SHIPPING_THRESHOLD } from "../config/store";
import { usePageTitle } from "../hooks/usePageTitle";
import { useChatOffset } from "../hooks/useChatOffset";
import QuantitySelector from "../components/ui/QuantitySelector";
import EmptyState from "../components/ui/EmptyState";
import Breadcrumb from "../components/ui/Breadcrumb";
import { OrderItemSkeleton, LoadingRegion } from "../components/ui/Skeleton";
import FreeShippingProgress from "../components/FreeShippingProgress";
import type { ICartItem } from "../types";

/** Units still available for this line (variant stock when it has one) */
const lineStock = (item: ICartItem): number | undefined => {
  if (item.variant && typeof item.variant.stock === "number") return item.variant.stock;
  if (typeof item.product?.stock === "number") return item.product.stock;
  return undefined;
};

const linePrice = (item: ICartItem): number => item.currentPrice || item.priceAtAdd || item.product?.price || 0;

const Cart = () => {
  usePageTitle("Your cart");
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { items, subtotal, loading, hasLoaded } = useAppSelector(selectCart);
  const [busyItem, setBusyItem] = useState<string | null>(null);
  useChatOffset(items.length > 0, "5.5rem");

  useEffect(() => {
    dispatch(fetchCart());
  }, [dispatch]);

  const handleUpdateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      if (quantity < 1) return;
      setBusyItem(itemId);
      try {
        await dispatch(updateCartItem({ itemId, quantity })).unwrap();
      } catch (error) {
        toast.error(typeof error === "string" ? error : "Couldn't update quantity");
      } finally {
        setBusyItem(null);
      }
    },
    [dispatch],
  );

  const handleRemove = useCallback(
    async (item: ICartItem) => {
      setBusyItem(item._id);
      try {
        await dispatch(removeFromCart(item._id)).unwrap();
        toast.success(`Removed ${item.product?.name || "item"}`);
      } catch (error) {
        toast.error(typeof error === "string" ? error : "Couldn't remove item");
      } finally {
        setBusyItem(null);
      }
    },
    [dispatch],
  );

  if (!hasLoaded || (loading && items.length === 0)) {
    return (
      <div className="container-app py-8">
        <h1 className="text-2xl md:text-3xl font-bold mb-6">Your cart</h1>
        <LoadingRegion label="Loading your cart" className="space-y-4 max-w-3xl">
          <OrderItemSkeleton />
          <OrderItemSkeleton />
        </LoadingRegion>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container-app py-8">
        <EmptyState type="cart" headingLevel="h1" secondaryLabel="Or browse by age" secondaryLink="/#shop-by-age" />
      </div>
    );
  }

  const problems = items.filter((item) => {
    const stock = lineStock(item);
    return stock !== undefined && stock < item.quantity;
  });
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const freeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;

  return (
    <div className="container-app py-6 md:py-8 pb-32 lg:pb-8">
      <Breadcrumb items={[{ label: "Cart" }]} className="mb-5" />
      <h1 className="text-2xl md:text-3xl font-bold mb-6">
        Your cart <span className="text-base font-normal text-[var(--color-text-muted)]">({itemCount} {itemCount === 1 ? "item" : "items"})</span>
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-4">
          <FreeShippingProgress subtotal={subtotal} />

          {problems.length > 0 && (
            <div role="alert" className="flex items-start gap-2 p-3 rounded-lg border border-amber-300 bg-amber-50 text-amber-900 dark:bg-amber-900/20 dark:text-amber-200 dark:border-amber-700 text-sm">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
              Some items have less stock than you've added. Lower the quantity to continue to checkout.
            </div>
          )}

          <ul className="space-y-3">
            {items.map((item) => {
              const stock = lineStock(item);
              const tooMany = stock !== undefined && stock < item.quantity;
              const price = linePrice(item);
              const name = item.product?.name || "Product";
              const href = `/products/${item.product?.slug || item.product}`;
              const variant = item.variant || item.variantDetails;
              return (
                <li key={item._id} className={`card p-3 sm:p-4 flex gap-3 sm:gap-4 ${busyItem === item._id ? "opacity-60" : ""}`}>
                  <Link to={href} className="shrink-0" tabIndex={-1} aria-hidden="true">
                    <img
                      src={imageUrl(item.variant?.image || item.product?.images?.[0]?.url, 192)}
                      alt=""
                      width={96}
                      height={96}
                      onError={onImageError}
                      className="w-20 h-20 sm:w-24 sm:h-24 object-cover rounded-lg bg-[var(--color-surface-muted)]"
                    />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-3">
                      <div className="min-w-0">
                        <Link to={href} className="font-medium hover:text-[var(--color-primary)] line-clamp-2">
                          {name}
                        </Link>
                        {variant && (
                          <p className="text-sm text-[var(--color-text-muted)]">
                            {variant.size} · {variant.color}
                          </p>
                        )}
                        <p className="text-sm text-[var(--color-text-muted)] mt-0.5">{formatPrice(price)} each</p>
                        {item.priceChanged && (
                          <p className="text-xs text-[var(--color-warning)] mt-0.5">Price updated since you added it</p>
                        )}
                      </div>
                      <p className="font-bold shrink-0">{formatPrice(price * item.quantity)}</p>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 mt-3">
                      <QuantitySelector
                        size="sm"
                        value={item.quantity}
                        min={1}
                        max={Math.max(item.quantity, stock ?? 99)}
                        onChange={(q) => handleUpdateQuantity(item._id, q)}
                        disabled={busyItem === item._id}
                        label={`Quantity for ${name}`}
                      />
                      <button
                        type="button"
                        onClick={() => handleRemove(item)}
                        disabled={busyItem === item._id}
                        className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-error)] flex items-center gap-1"
                        aria-label={`Remove ${name} from cart`}
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                        Remove
                      </button>
                    </div>

                    {tooMany ? (
                      <p className="text-xs font-medium text-[var(--color-error)] mt-2">
                        {stock === 0 ? "Sold out — please remove this item" : `Only ${stock} left — please lower the quantity`}
                      </p>
                    ) : (
                      stock !== undefined &&
                      stock <= 5 && <p className="text-xs text-[var(--color-warning)] mt-2">Only {stock} left</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>

          <Link to="/products" className="inline-block text-sm text-[var(--color-primary)] hover:underline underline-offset-4">
            ← Continue shopping
          </Link>
        </div>

        {/* Summary */}
        <aside className="lg:col-span-1" aria-label="Order summary">
          <div className="card p-5 md:p-6 lg:sticky lg:top-24">
            <h2 className="font-semibold text-lg mb-4 font-sans">Order summary</h2>
            <dl className="space-y-3 mb-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-muted)]">Subtotal</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--color-text-muted)]">Shipping</dt>
                <dd className={freeShipping ? "text-[var(--color-success)] font-medium" : "text-right"}>
                  {freeShipping ? "Free" : "NPR 100–300, based on your address"}
                </dd>
              </div>
            </dl>
            <div className="border-t border-[var(--color-border)] pt-4 mb-5 flex justify-between text-lg font-bold">
              <span>Subtotal</span>
              <span className="text-[var(--color-primary)]">{formatPrice(subtotal)}</span>
            </div>

            <button
              type="button"
              onClick={() => navigate("/checkout")}
              disabled={problems.length > 0}
              className="btn btn-primary w-full py-3 hidden lg:inline-flex"
            >
              Checkout
              <ArrowRight className="w-4 h-4" aria-hidden="true" />
            </button>
            {problems.length > 0 && (
              <p className="text-xs text-[var(--color-error)] mt-2 hidden lg:block">Fix the stock issues above to continue.</p>
            )}
            <p className="flex items-center justify-center gap-1.5 text-xs text-[var(--color-text-muted)] mt-3">
              <Lock className="w-3.5 h-3.5" aria-hidden="true" />
              Cash on delivery or eSewa at checkout
            </p>
          </div>
        </aside>
      </div>

      {/* Sticky checkout bar (phones/tablets) */}
      <div className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-[var(--color-surface)] border-t border-[var(--color-border)] shadow-[var(--shadow-lg)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <div className="flex items-center gap-3 container-app px-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-[var(--color-text-muted)]">Subtotal · {itemCount} {itemCount === 1 ? "item" : "items"}</p>
            <p className="text-lg font-bold text-[var(--color-primary)]">{formatPrice(subtotal)}</p>
          </div>
          <button type="button" onClick={() => navigate("/checkout")} disabled={problems.length > 0} className="btn btn-primary px-6 py-3">
            Checkout
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Cart;
