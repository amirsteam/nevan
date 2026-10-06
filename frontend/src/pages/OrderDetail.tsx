/**
 * Order Detail Page
 * Progress stepper, items, totals, delivery address, payment, and help
 */
import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, MapPin, CreditCard, Package, MessageCircle, AlertTriangle, Clock } from "lucide-react";
import { ordersAPI } from "../api";
import { formatPrice, formatDate, getErrorMessage } from "../utils/helpers";
import { imageUrl, onImageError } from "../utils/image";
import { PROVINCE_NAMES } from "../utils/nepal";
import { canPayOnline } from "../utils/payment";
import { useAppDispatch } from "../store/hooks";
import { openChat } from "../store/chatSlice";
import { usePageTitle } from "../hooks/usePageTitle";
import PayNowButton from "../components/PayNowButton";
import OrderStatusStepper from "../components/OrderStatusStepper";
import { OrderStatusBadge, PaymentStatusBadge } from "../components/ui/Badge";
import { ConfirmModal } from "../components/ui/Modal";
import { LoadingRegion, Skeleton } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import type { IOrder } from "../types";

const PAYMENT_LABELS: Record<string, string> = { cod: "Cash on delivery", esewa: "eSewa", khalti: "Khalti" };

const OrderDetail = () => {
  const { id = "" } = useParams();
  const dispatch = useAppDispatch();
  const [order, setOrder] = useState<IOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await ordersAPI.getOrder(id);
      setOrder(response.data.order);
    } catch {
      setOrder(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const orderNumber = order ? order.orderNumber || order._id.slice(-6).toUpperCase() : "";
  usePageTitle(order ? `Order #${orderNumber}` : "Order");

  const handleCancelOrder = async () => {
    setCancelling(true);
    try {
      await ordersAPI.cancelOrder(id, "Cancelled by customer");
      toast.success("Order cancelled");
      setConfirmCancel(false);
      await load();
    } catch (error) {
      toast.error(getErrorMessage(error, "Couldn't cancel this order"));
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <LoadingRegion label="Loading order" className="container-app py-8 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-64 lg:col-span-2 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </LoadingRegion>
    );
  }

  if (!order) {
    return (
      <div className="container-app py-12">
        <EmptyState
          type="orders"
          headingLevel="h1"
          title="We couldn't find that order"
          description="It may belong to another account, or the link is incomplete."
          actionLabel="View my orders"
          actionLink="/orders"
        />
      </div>
    );
  }

  const status = order.orderStatus ?? order.status;
  const paymentMethod = order.payment?.method ?? order.paymentMethod;
  const paymentStatus = order.payment?.status ?? order.paymentStatus;
  const subtotal = order.subtotal ?? order.pricing?.subtotal ?? 0;
  const shippingCost = order.shippingCost ?? order.pricing?.shippingCost ?? 0;
  const total = order.total ?? order.pricing?.total ?? 0;
  const canCancel = order.canBeCancelled && !(paymentStatus === "paid" && paymentMethod !== "cod");
  const awaitingPayment = canPayOnline(order);

  return (
    <div className="container-app py-6 md:py-8">
      <Link to="/orders" className="inline-flex items-center text-sm text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-5">
        <ArrowLeft className="w-4 h-4 mr-1" aria-hidden="true" />
        All orders
      </Link>

      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-1">
            <h1 className="text-2xl md:text-3xl font-bold">Order #{orderNumber}</h1>
            {status && <OrderStatusBadge status={status} />}
          </div>
          <p className="text-[var(--color-text-muted)]">Placed on {formatDate(order.createdAt)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => dispatch(openChat({ draft: `Hi! I have a question about order #${orderNumber}: ` }))}
            className="btn btn-secondary text-sm"
          >
            <MessageCircle className="w-4 h-4" aria-hidden="true" />
            Need help?
          </button>
          {canCancel && (
            <button
              type="button"
              onClick={() => setConfirmCancel(true)}
              className="btn btn-secondary text-sm text-[var(--color-error)] hover:border-[var(--color-error)]"
            >
              Cancel order
            </button>
          )}
        </div>
      </div>

      {awaitingPayment && (
        <div role="status" className="card p-4 md:p-5 mb-6 border-amber-300 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 flex flex-col sm:flex-row sm:items-center gap-4">
          <Clock className="w-6 h-6 text-amber-700 dark:text-amber-300 shrink-0" aria-hidden="true" />
          <div className="flex-1 text-sm">
            <p className="font-semibold text-amber-900 dark:text-amber-100">Payment not received yet</p>
            <p className="text-amber-900/80 dark:text-amber-100/80">
              Complete the {PAYMENT_LABELS[paymentMethod] || paymentMethod} payment to confirm your order. Unpaid online orders are cancelled automatically after 30
              minutes.
            </p>
          </div>
          <PayNowButton order={order} className="shrink-0" />
        </div>
      )}

      <section className="card p-5 md:p-6 mb-6" aria-labelledby="progress-heading">
        <h2 id="progress-heading" className="sr-only">
          Order progress
        </h2>
        <OrderStatusStepper order={order} />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <section className="lg:col-span-2 card overflow-hidden" aria-labelledby="items-heading">
          <h2 id="items-heading" className="px-5 md:px-6 py-4 border-b border-[var(--color-border)] font-semibold flex items-center gap-2 font-sans">
            <Package className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
            Items ({order.items.length})
          </h2>
          <ul className="divide-y divide-[var(--color-border)]">
            {order.items.map((item) => (
              <li key={item._id} className="p-4 md:p-5 flex gap-4">
                <img
                  src={imageUrl(item.image, 160)}
                  alt=""
                  onError={onImageError}
                  className="w-20 h-20 shrink-0 rounded-lg object-cover bg-[var(--color-surface-muted)]"
                />
                <div className="flex-1 min-w-0">
                  {item.slug ? (
                    <Link to={`/products/${item.slug}`} className="font-medium hover:text-[var(--color-primary)] line-clamp-2">
                      {item.name}
                    </Link>
                  ) : (
                    <p className="font-medium line-clamp-2">{item.name}</p>
                  )}
                  {item.variant && (
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {item.variant.size} · {item.variant.color}
                    </p>
                  )}
                  <div className="flex justify-between items-center mt-1 text-sm">
                    <span className="text-[var(--color-text-muted)]">
                      {item.quantity} × {formatPrice(item.price)}
                    </span>
                    <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
          {order.customerNotes && (
            <p className="px-5 md:px-6 py-4 border-t border-[var(--color-border)] text-sm">
              <span className="font-medium">Your note:</span> <span className="text-[var(--color-text-muted)]">{order.customerNotes}</span>
            </p>
          )}
        </section>

        <div className="space-y-6">
          <section className="card p-5 md:p-6" aria-labelledby="summary-heading">
            <h2 id="summary-heading" className="font-semibold mb-4 font-sans">
              Summary
            </h2>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-muted)]">Subtotal</dt>
                <dd>{formatPrice(subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-text-muted)]">Shipping</dt>
                <dd>{shippingCost === 0 ? "Free" : formatPrice(shippingCost)}</dd>
              </div>
              <div className="border-t border-[var(--color-border)] pt-3 flex justify-between font-bold text-lg">
                <dt>Total</dt>
                <dd className="text-[var(--color-primary)]">{formatPrice(total)}</dd>
              </div>
            </dl>
          </section>

          <section className="card p-5 md:p-6" aria-labelledby="address-heading">
            <h2 id="address-heading" className="font-semibold flex items-center gap-2 mb-3 font-sans">
              <MapPin className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
              Delivery address
            </h2>
            <address className="not-italic text-sm text-[var(--color-text-muted)] space-y-0.5">
              <p className="font-medium text-[var(--color-text)]">{order.shippingAddress.name || order.shippingAddress.fullName}</p>
              <p>{order.shippingAddress.street}</p>
              {order.shippingAddress.landmark && <p>Near {order.shippingAddress.landmark}</p>}
              <p>{[order.shippingAddress.city, order.shippingAddress.district].filter(Boolean).join(", ")}</p>
              {order.shippingAddress.province && <p>{PROVINCE_NAMES[order.shippingAddress.province]} Province</p>}
              <p className="pt-1 text-[var(--color-text)]">{order.shippingAddress.phone}</p>
            </address>
          </section>

          <section className="card p-5 md:p-6" aria-labelledby="payment-heading">
            <h2 id="payment-heading" className="font-semibold flex items-center gap-2 mb-3 font-sans">
              <CreditCard className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
              Payment
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{PAYMENT_LABELS[paymentMethod] || paymentMethod}</p>
              {paymentStatus && <PaymentStatusBadge status={paymentStatus} size="sm" />}
            </div>
            {order.payment?.transactionId && (
              <p className="text-xs text-[var(--color-text-muted)] break-all mt-2">Transaction ID: {order.payment.transactionId}</p>
            )}
            {status === "cancelled" && paymentStatus === "paid" && paymentMethod !== "cod" && (
              <p className="mt-3 flex items-start gap-2 text-xs text-[var(--color-warning)]">
                <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                We'll refund this payment. Chat with us if you have questions.
              </p>
            )}
          </section>
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmCancel}
        onClose={() => setConfirmCancel(false)}
        onConfirm={handleCancelOrder}
        isLoading={cancelling}
        title="Cancel this order?"
        message={`Order #${orderNumber} will be cancelled and the items released. This can't be undone.`}
        confirmText="Cancel order"
        cancelText="Keep order"
      />
    </div>
  );
};

export default OrderDetail;
