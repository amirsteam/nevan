/**
 * Orders Page
 * The customer's order history
 */
import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { ordersAPI } from "../api";
import { formatPrice, formatDate, populated } from "../utils/helpers";
import { imageUrl, onImageError } from "../utils/image";
import { canPayOnline } from "../utils/payment";
import { usePageTitle } from "../hooks/usePageTitle";
import { OrderStatusBadge } from "../components/ui/Badge";
import { OrderItemSkeleton, LoadingRegion } from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import Breadcrumb from "../components/ui/Breadcrumb";
import PayNowButton from "../components/PayNowButton";
import type { IOrder, IOrderItem } from "../types";

const Orders = () => {
  usePageTitle("My orders");
  const [orders, setOrders] = useState<IOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const response = await ordersAPI.getMyOrders();
      setOrders(response.data.orders);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="container-app py-6 md:py-8">
      <Breadcrumb items={[{ label: "Account", path: "/profile" }, { label: "Orders" }]} className="mb-5" />
      <h1 className="text-2xl md:text-3xl font-bold mb-6">My orders</h1>

      {loading ? (
        <LoadingRegion label="Loading your orders" className="space-y-4">
          <OrderItemSkeleton />
          <OrderItemSkeleton />
          <OrderItemSkeleton />
        </LoadingRegion>
      ) : error ? (
        <EmptyState
          type="generic"
          title="Couldn't load your orders"
          description="Please check your connection and try again."
          actionLabel="Try again"
          onAction={load}
        />
      ) : orders.length === 0 ? (
        <EmptyState type="orders" />
      ) : (
        <ul className="space-y-4">
          {orders.map((order) => {
            const status = order.orderStatus ?? order.status;
            const number = order.orderNumber || order._id.slice(-6).toUpperCase();
            return (
              <li key={order._id} className="card p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <p className="font-semibold">
                      <Link to={`/orders/${order._id}`} className="hover:text-[var(--color-primary)]">
                        Order #{number}
                      </Link>
                    </p>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      {formatDate(order.createdAt)} · {order.items.length} {order.items.length === 1 ? "item" : "items"} ·{" "}
                      <span className="font-medium text-[var(--color-text)]">{formatPrice(order.total ?? order.pricing?.total ?? 0)}</span>
                    </p>
                  </div>
                  {status && <OrderStatusBadge status={status} size="sm" />}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex -space-x-2" aria-hidden="true">
                    {order.items.slice(0, 4).map((item: IOrderItem) => (
                      <img
                        key={item._id || populated(item.product)?._id || item.name}
                        src={imageUrl(item.image || populated(item.product)?.images?.[0]?.url, 80)}
                        alt=""
                        onError={onImageError}
                        className="h-11 w-11 rounded-full ring-2 ring-[var(--color-surface)] object-cover bg-[var(--color-surface-muted)]"
                      />
                    ))}
                    {order.items.length > 4 && (
                      <span className="flex items-center justify-center h-11 w-11 rounded-full ring-2 ring-[var(--color-surface)] bg-[var(--color-surface-muted)] text-xs font-medium text-[var(--color-text-muted)]">
                        +{order.items.length - 4}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                    {canPayOnline(order) && <PayNowButton order={order} className="text-sm flex-1 sm:flex-none" />}
                    <Link
                      to={`/orders/${order._id}`}
                      className="btn btn-secondary text-sm flex-1 sm:flex-none"
                      aria-label={`View order #${number}`}
                    >
                      View order
                      <ChevronRight className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default Orders;
