/**
 * Order Failed Page
 * Shown when an eSewa/Khalti payment is cancelled or fails. The order still
 * exists (unpaid) for 30 minutes, so the shopper can retry paying for it.
 */
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { XCircle, ShoppingCart, Package, Loader2 } from "lucide-react";
import { ordersAPI } from "../api/orders";
import { useAuth } from "../context/AuthContext";
import PayNowButton from "../components/PayNowButton";
import { canPayOnline } from "../utils/payment";
import type { IOrder } from "../types";
import { usePageTitle } from "../hooks/usePageTitle";

const OrderFailed = () => {
  usePageTitle("Payment not completed");
  const [searchParams] = useSearchParams();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [order, setOrder] = useState<IOrder | null>(null);
  const [fetchedOrderId, setFetchedOrderId] = useState<string | null>(null);

  const orderId = searchParams.get("orderId");
  // URLSearchParams already decodes the value
  const message = searchParams.get("message") || "Your payment could not be processed";
  const gateway = searchParams.get("gateway");

  useEffect(() => {
    if (!orderId || authLoading || !isAuthenticated) return;
    ordersAPI
      .getOrder(orderId)
      .then((res) => setOrder(res.data.order))
      .catch(() => setOrder(null))
      .finally(() => setFetchedOrderId(orderId));
  }, [orderId, isAuthenticated, authLoading]);

  const loadingOrder =
    !!orderId && (authLoading || (isAuthenticated && fetchedOrderId !== orderId));

  const retryable = canPayOnline(order);
  const orderCancelled = (order?.orderStatus ?? order?.status) === "cancelled";

  return (
    <div className="container-app py-12">
      <div className="max-w-lg mx-auto text-center">
        <div className="mb-6">
          <XCircle className="w-20 h-20 mx-auto text-[var(--color-error)]" />
        </div>

        <h1 className="text-3xl font-bold text-[var(--color-error)] mb-2">
          Payment Failed
        </h1>
        <p className="text-[var(--color-text-muted)] mb-2">{message}</p>
        {gateway && (
          <p className="text-sm text-[var(--color-text-muted)] mb-8">
            Payment gateway: <span className="capitalize">{gateway}</span>
          </p>
        )}

        <div className="card p-6 text-left mb-8 bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30">
          <h3 className="font-semibold mb-2">What happened?</h3>
          <p className="text-sm text-[var(--color-text-muted)]">
            Your payment was not completed. This could happen if:
          </p>
          <ul className="text-sm text-[var(--color-text-muted)] mt-2 list-disc list-inside space-y-1">
            <li>You cancelled the payment</li>
            <li>There was a network issue</li>
            <li>Your payment method was declined</li>
            <li>The session expired</li>
          </ul>
          <p className="text-sm mt-3">
            {orderCancelled ? (
              <>This order has been cancelled. Your cart items are still saved, so you can place a new order.</>
            ) : (
              <>
                <strong>Good news:</strong> Your order is kept for 30 minutes and your cart
                items are still saved, so you can try paying again.
              </>
            )}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {loadingOrder ? (
            <Loader2 className="w-6 h-6 animate-spin text-[var(--color-primary)] mx-auto" />
          ) : retryable && order ? (
            <PayNowButton order={order} />
          ) : (
            <Link to="/checkout" className="btn btn-primary flex items-center justify-center gap-2">
              Try Again
            </Link>
          )}
          {order && (
            <Link
              to={`/orders/${order._id}`}
              className="btn btn-outline flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4" />
              View Order
            </Link>
          )}
          <Link to="/cart" className="btn btn-outline flex items-center justify-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            View Cart
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderFailed;
