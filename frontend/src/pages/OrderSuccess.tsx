/**
 * Order Success Page
 * Shown after placing an order and after returning from eSewa/Khalti. For an
 * online order that isn't marked paid yet, it asks the API to check with the
 * gateway (which marks the order paid if the money arrived) before offering to
 * pay again — never while the gateway is still confirming a payment.
 */
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { resetCart, fetchCart } from "../store/cartSlice";
import { useAppDispatch } from "../store/hooks";
import type { IOrder } from "../types";
import { paymentsAPI, ordersAPI } from "../api/orders";
import { formatPrice, getErrorMessage } from "../utils/helpers";
import { CheckCircle, Package, Loader2, AlertCircle, Clock, Info } from "lucide-react";
import PayNowButton from "../components/PayNowButton";
import { isOnlinePayment } from "../utils/payment";
import toast from "react-hot-toast";
import { usePageTitle } from "../hooks/usePageTitle";

// How long to keep asking the gateway while it confirms a payment
const POLL_INTERVAL_MS = 5000;
const POLL_FOR_MS = 60000;

const isUnpaidOnline = (order: IOrder | null): boolean =>
  !!order &&
  isOnlinePayment(order.payment?.method ?? order.paymentMethod) &&
  (order.payment?.status ?? order.paymentStatus) !== "paid";

const OrderSuccess = () => {
  usePageTitle("Order placed");
  const [searchParams] = useSearchParams();
  const dispatch = useAppDispatch();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<IOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Checking with the gateway right now
  const [confirming, setConfirming] = useState(false);
  // The gateway says it is still processing a payment for this order
  const [processing, setProcessing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const orderId = searchParams.get("orderId");
  // Set by the API's gateway redirect: "pending" (not confirmed yet) or "duplicate" (paid twice)
  const paymentParam = searchParams.get("payment");
  const cameBackPending = paymentParam === "pending";

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setError("No order ID provided");
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const loadOrder = async () => {
      const response = await ordersAPI.getOrder(orderId);
      if (!cancelled) setOrder(response.data.order);
      return response.data.order;
    };

    // Ask the API to check with the gateway; repeat while the gateway is still
    // confirming (or the shopper just came back unconfirmed), up to a minute
    const confirm = async (startedAt: number) => {
      try {
        const { data } = await paymentsAPI.checkStatus(orderId);
        if (cancelled) return;
        setProcessing(data.processing);
        if (data.paymentStatus === "paid") {
          await loadOrder();
          dispatch(fetchCart());
          toast.success("Payment confirmed!");
        } else if ((data.processing || cameBackPending) && Date.now() - startedAt < POLL_FOR_MS) {
          timer = setTimeout(() => confirm(startedAt), POLL_INTERVAL_MS);
          return;
        }
      } catch {
        // Offline or the check failed: show the order as it is
      }
      if (!cancelled) setConfirming(false);
    };

    const load = async () => {
      try {
        const loaded = await loadOrder();
        // Fresh cart from the server (paid items have been removed from it)
        dispatch(resetCart());
        dispatch(fetchCart());
        if (!cancelled && isUnpaidOnline(loaded)) {
          setConfirming(true);
          confirm(Date.now());
        }
      } catch (err) {
        if (!cancelled) setError(getErrorMessage(err, "Failed to load order details"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [orderId, cameBackPending, dispatch, reloadKey]);

  if (loading) {
    return (
      <div className="container-app py-20 text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-[var(--color-primary)]" />
        <p className="mt-4 text-[var(--color-text-muted)]">Loading order details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-app py-20 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-[var(--color-warning)] mb-4" />
        <h1 className="text-2xl font-bold mb-2">Order Processing</h1>
        <p className="text-[var(--color-text-muted)] mb-6">{error}</p>
        <Link to="/orders" className="btn btn-primary">
          View My Orders
        </Link>
      </div>
    );
  }

  const unpaidOnline = isUnpaidOnline(order);
  const gatewayName = (order?.payment?.method ?? order?.paymentMethod) === "khalti" ? "Khalti" : "eSewa";
  const cancelledUnpaid = unpaidOnline && (order?.orderStatus ?? order?.status) === "cancelled";

  return (
    <div className="container-app py-12">
      <div className="max-w-2xl mx-auto text-center" aria-live="polite">
        {unpaidOnline && (confirming || processing) ? (
          <>
            <div className="mb-6">
              {confirming ? (
                <Loader2 className="w-20 h-20 mx-auto animate-spin text-[var(--color-primary)]" />
              ) : (
                <Clock className="w-20 h-20 mx-auto text-[var(--color-warning)]" />
              )}
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {confirming ? "Confirming your payment…" : "Your payment is still being confirmed"}
            </h1>
            <p className="text-[var(--color-text-muted)] mb-8">
              {confirming
                ? `We're checking with ${gatewayName}. This usually takes a few seconds — please don't pay again.`
                : `${gatewayName} hasn't confirmed your payment yet. We'll update your order as soon as it does, so please don't pay again. Check your order again in a few minutes.`}
            </p>
          </>
        ) : cancelledUnpaid ? (
          <>
            <div className="mb-6">
              <AlertCircle className="w-20 h-20 mx-auto text-[var(--color-warning)]" />
            </div>
            <h1 className="text-3xl font-bold mb-2">This order was cancelled</h1>
            <p className="text-[var(--color-text-muted)] mb-8">
              The payment wasn't completed in time, so the order was cancelled and its items were released. Your cart
              still has them if you'd like to order again. If you were charged, please contact us.
            </p>
          </>
        ) : unpaidOnline ? (
          <>
            <div className="mb-6">
              <Clock className="w-20 h-20 mx-auto text-[var(--color-warning)]" />
            </div>
            <h1 className="text-3xl font-bold mb-2">Payment not completed</h1>
            <p className="text-[var(--color-text-muted)] mb-6">
              Your order is reserved, but we haven't received the payment yet.
              Unpaid online orders are cancelled after 30 minutes.
            </p>
            {order && (
              <PayNowButton order={order} className="mx-auto mb-8" onAlreadyPaid={() => setReloadKey((k) => k + 1)} />
            )}
          </>
        ) : (
          <>
            {/* Success Icon */}
            <div className="mb-6">
              <CheckCircle className="w-20 h-20 mx-auto text-[var(--color-success)]" />
            </div>

            {/* Success Message */}
            <h1 className="text-3xl font-bold text-[var(--color-success)] mb-2">
              Order Placed Successfully!
            </h1>
            <p className="text-[var(--color-text-muted)] mb-8">
              Thank you for your order. We'll send you an update when it ships.
            </p>
            {(paymentParam === "duplicate" || order?.payment?.refundRequired) && (
              <div className="card p-4 mb-8 flex gap-3 text-left bg-[var(--color-warning)]/10 border-[var(--color-warning)]/30">
                <Info className="w-5 h-5 shrink-0 mt-0.5 text-[var(--color-warning)]" aria-hidden="true" />
                <p className="text-sm">
                  We received more than one payment for this order. We'll refund the extra payment — you don't need
                  to do anything.
                </p>
              </div>
            )}
          </>
        )}

        {/* Order Details Card */}
        {order && (
          <div className="card p-6 text-left mb-8">
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-[var(--color-border)]">
              <Package className="w-6 h-6 text-[var(--color-primary)]" />
              <div>
                <p className="text-sm text-[var(--color-text-muted)]">
                  Order Number
                </p>
                <p className="font-semibold">{order.orderNumber}</p>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Items</span>
                <span>{order.items?.length || 0} product(s)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">
                  Payment Method
                </span>
                <span className="capitalize">
                  {order.payment?.method || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">
                  Payment Status
                </span>
                <span
                  className={`capitalize font-medium ${
                    order.payment?.status === "paid"
                      ? "text-[var(--color-success)]"
                      : "text-[var(--color-warning)]"
                  }`}
                >
                  {order.payment?.status || "pending"}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-[var(--color-border)] flex justify-between items-center">
              <span className="font-semibold">Total</span>
              <span className="text-xl font-bold text-[var(--color-primary)]">
                {formatPrice(order.total ?? order.pricing?.total ?? 0)}
              </span>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link to={`/orders/${orderId}`} className="btn btn-primary">
            View Order Details
          </Link>
          <Link to={cancelledUnpaid ? "/cart" : "/products"} className="btn btn-outline">
            {cancelledUnpaid ? "Back to cart" : "Continue Shopping"}
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
