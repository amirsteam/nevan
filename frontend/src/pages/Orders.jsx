/**
 * Orders Page
 * Lists user's order history
 */
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ordersAPI } from "../api";
import { formatPrice, formatDate } from "../utils/helpers";
import { Loader2, Package, ChevronRight, AlertCircle } from "lucide-react";

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await ordersAPI.getMyOrders();
        setOrders(response.data.orders);
      } catch (err) {
        console.error("Failed to fetch orders:", err);
        setError("Failed to load your orders. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

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

  if (error) {
    return (
      <div className="container-app py-12 text-center">
        <AlertCircle className="w-12 h-12 text-[var(--color-error)] mx-auto mb-4" />
        <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
        <p className="text-[var(--color-text-muted)] mb-6">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="btn btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="container-app py-8">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Package className="w-6 h-6" />
        My Orders
      </h1>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)]">
          <Package className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-4" />
          <h2 className="text-xl font-medium mb-2">No orders yet</h2>
          <p className="text-[var(--color-text-muted)] mb-6">
            You haven't placed any orders yet. Start shopping to see your orders
            here.
          </p>
          <Link to="/products" className="btn btn-primary">
            Start Shopping
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <div
              key={order._id}
              className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm text-[var(--color-text-muted)]">
                      Order ID
                    </p>
                    <p className="font-mono font-medium">
                      #{order.orderNumber || order._id.slice(-6).toUpperCase()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        Date placed
                      </p>
                      <p className="font-medium">
                        {formatDate(order.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-[var(--color-text-muted)]">
                        Total amount
                      </p>
                      <p className="font-bold text-[var(--color-primary)]">
                        {formatPrice(order.total ?? order.pricing?.total ?? 0)}
                      </p>
                    </div>
                  </div>
                  <div>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium uppercase ${getStatusColor(order.orderStatus)}`}
                    >
                      {order.orderStatus}
                    </span>
                  </div>
                </div>

                <div className="border-t border-[var(--color-border)] pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex -space-x-2 overflow-hidden">
                    {order.items.slice(0, 4).map((item) => (
                      <img
                        key={item._id || item.product?._id}
                        src={
                          item.image ||
                          item.product?.images?.[0]?.url ||
                          "/placeholder.jpg"
                        }
                        alt={item.name}
                        className="inline-block h-10 w-10 rounded-full ring-2 ring-white object-cover"
                        title={item.product?.name}
                      />
                    ))}
                    {order.items.length > 4 && (
                      <div className="flex items-center justify-center h-10 w-10 rounded-full ring-2 ring-white bg-gray-100 text-xs font-medium text-gray-600">
                        +{order.items.length - 4}
                      </div>
                    )}
                  </div>

                  <Link
                    to={`/orders/${order._id}`}
                    className="btn btn-secondary text-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                  >
                    View Details
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;
