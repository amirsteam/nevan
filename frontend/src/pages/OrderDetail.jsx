/**
 * Order Detail Page
 * Shows full details of a specific order
 */
import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ordersAPI } from "../api";
import { formatPrice, formatDate } from "../utils/helpers";
import {
  Loader2,
  ArrowLeft,
  MapPin,
  CreditCard,
  Package,
  Truck,
  AlertTriangle,
} from "lucide-react";
import toast from "react-hot-toast";

const OrderDetail = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const response = await ordersAPI.getOrder(id);
        setOrder(response.data.order);
      } catch (error) {
        console.error("Failed to fetch order:", error);
        toast.error("Failed to load order details");
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  const handleCancelOrder = async () => {
    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    setActionLoading(true);
    try {
      await ordersAPI.cancelOrder(id, "User requested cancellation");
      toast.success("Order cancelled successfully");
      // Refresh order
      const response = await ordersAPI.getOrder(id);
      setOrder(response.data.order);
    } catch (error) {
      console.error("Failed to cancel order:", error);
      toast.error(error.response?.data?.message || "Failed to cancel order");
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "delivered":
        return "bg-green-100 text-green-800";
      case "processing":
        return "bg-blue-100 text-blue-800";
      case "shipped":
        return "bg-purple-100 text-purple-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container-app py-12 text-center">
        <AlertTriangle className="w-12 h-12 text-[var(--color-error)] mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Order Not Found</h2>
        <Link to="/orders" className="btn btn-primary mt-4">
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <div className="container-app py-8">
      <Link
        to="/orders"
        className="inline-flex items-center text-[var(--color-text-muted)] hover:text-[var(--color-primary)] mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Orders
      </Link>

      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">
              Order #{order.orderNumber || order._id.slice(-6).toUpperCase()}
            </h1>
            <span
              className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${getStatusColor(order.orderStatus)}`}
            >
              {order.orderStatus}
            </span>
          </div>
          <p className="text-[var(--color-text-muted)]">
            Placed on {formatDate(order.createdAt)}
          </p>
        </div>

        {order.orderStatus === "pending" && (
          <div>
            <button
              onClick={handleCancelOrder}
              disabled={actionLoading}
              className="btn btn-outline text-red-500 border-red-200 hover:bg-red-50"
            >
              {actionLoading ? "Cancelling..." : "Cancel Order"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content - Items */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-[var(--color-border)]">
              <h2 className="font-semibold flex items-center gap-2">
                <Package className="w-5 h-5" />
                Order Items
              </h2>
            </div>
            <div className="divide-y divide-[var(--color-border)]">
              {order.items.map((item) => (
                <div key={item._id} className="p-6 flex gap-4">
                  <div className="w-20 h-20 flex-shrink-0 bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={
                        item.image ||
                        item.product?.images?.[0]?.url ||
                        "/placeholder.jpg"
                      }
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1">
                    <Link
                      to={`/products/${item.product?.slug}`}
                      className="font-medium hover:text-[var(--color-primary)] block mb-1"
                    >
                      {item.product?.name}
                    </Link>
                    <div className="text-sm text-[var(--color-text-muted)] mb-2">
                      {item.variant?.name && (
                        <span>Variant: {item.variant.name}</span>
                      )}
                      {item.variant?.optionValue && (
                        <span> • {item.variant.optionValue}</span>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-[var(--color-text-muted)]">
                        Qty: {item.quantity} × {formatPrice(item.price)}
                      </span>
                      <span className="font-medium">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline / Tracking (Placeholder logic as simplified timeline) */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <Truck className="w-5 h-5" />
              Order Status:{" "}
              {(order.orderStatus || "unknown").charAt(0).toUpperCase() +
                (order.orderStatus || "unknown").slice(1)}
            </h2>
            <div className="relative pl-4 border-l-2 border-[var(--color-border)] space-y-6">
              {/* Simplified steps */}
              <div className="relative">
                <span className="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-[var(--color-primary)] border-2 border-white"></span>
                <p className="font-medium">Order Placed</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  {formatDate(order.createdAt)}
                </p>
              </div>
              {order.orderStatus !== "pending" &&
                order.orderStatus !== "cancelled" && (
                  <div className="relative">
                    <span className="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-[var(--color-primary)] border-2 border-white"></span>
                    <p className="font-medium">Processing</p>
                  </div>
                )}
              {order.orderStatus === "shipped" && (
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-[var(--color-primary)] border-2 border-white"></span>
                  <p className="font-medium">Shipped</p>
                </div>
              )}
              {order.orderStatus === "delivered" && (
                <div className="relative">
                  <span className="absolute -left-[21px] top-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white"></span>
                  <p className="font-medium text-green-600">Delivered</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Summary */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
            <h2 className="font-semibold mb-4">Order Summary</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Subtotal</span>
                <span>
                  {formatPrice(order.subtotal ?? order.pricing?.subtotal ?? 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Shipping</span>
                <span>
                  {(order.shippingCost ?? order.pricing?.shippingCost ?? 0) ===
                  0
                    ? "Free"
                    : formatPrice(
                        order.shippingCost ?? order.pricing?.shippingCost ?? 0,
                      )}
                </span>
              </div>
              <div className="border-t border-[var(--color-border)] pt-3 flex justify-between font-bold text-lg">
                <span>Total</span>
                <span className="text-[var(--color-primary)]">
                  {formatPrice(order.total ?? order.pricing?.total ?? 0)}
                </span>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <MapPin className="w-5 h-5" />
              Shipping Address
            </h2>
            <address className="not-italic text-sm text-[var(--color-text-muted)] space-y-1">
              <p className="font-medium text-[var(--color-text)]">
                {order.shippingAddress.fullName}
              </p>
              <p>{order.shippingAddress.address}</p>
              <p>
                {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
                {order.shippingAddress.postalCode}
              </p>
              <p>{order.shippingAddress.country}</p>
              <p className="mt-2 text-[var(--color-text)]">
                {order.shippingAddress.phone}
              </p>
            </address>
          </div>

          {/* Payment Info */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-6">
            <h2 className="font-semibold flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5" />
              Payment Method
            </h2>
            <div className="flex items-center gap-2 mb-2">
              <p className="font-medium capitalize">{order.paymentMethod}</p>
              <span
                className={`px-2 py-0.5 rounded text-xs ${order.paymentStatus === "completed" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}
              >
                {order.paymentStatus}
              </span>
            </div>
            {order.paymentDetails?.transactionId && (
              <p className="text-xs text-[var(--color-text-muted)] break-all">
                Transaction ID: {order.paymentDetails.transactionId}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderDetail;
