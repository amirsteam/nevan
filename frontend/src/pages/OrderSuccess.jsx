/**
 * Order Success Page
 * Handles successful payments including eSewa verification
 */
import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useDispatch } from "react-redux";
import { resetCart, fetchCart } from "../store/cartSlice";
import { paymentsAPI, ordersAPI } from "../api/orders";
import { formatPrice } from "../utils/helpers";
import { CheckCircle, Package, Loader2, AlertCircle } from "lucide-react";
import toast from "react-hot-toast";

const OrderSuccess = () => {
  const [searchParams] = useSearchParams();
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [verifying, setVerifying] = useState(false);

  const orderId = searchParams.get("orderId");
  const esewaData = searchParams.get("data"); // eSewa returns encoded data

  useEffect(() => {
    const processOrder = async () => {
      try {
        // If eSewa data is present, verify payment first
        if (esewaData) {
          setVerifying(true);
          try {
            await paymentsAPI.verifyPayment(orderId, "esewa", {
              data: esewaData,
            });
            toast.success("Payment verified successfully!");
          } catch (verifyError) {
            console.error("eSewa verification failed:", verifyError);
            // Continue to show order details even if verification fails
            // The backend callback might have already verified
          }
          setVerifying(false);
        }

        // Fetch order details
        if (orderId) {
          const response = await ordersAPI.getOrder(orderId);
          setOrder(response.data?.order || response.data);
        }

        // Reset the cart (fetch fresh state from server)
        dispatch(resetCart());
        dispatch(fetchCart());
      } catch (err) {
        console.error("Error processing order:", err);
        setError(err.response?.data?.message || "Failed to load order details");
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      processOrder();
    } else {
      setLoading(false);
      setError("No order ID provided");
    }
  }, [orderId, esewaData, dispatch]);

  if (loading || verifying) {
    return (
      <div className="container-app py-20 text-center">
        <Loader2 className="w-12 h-12 animate-spin mx-auto text-[var(--color-primary)]" />
        <p className="mt-4 text-[var(--color-text-muted)]">
          {verifying ? "Verifying payment..." : "Loading order details..."}
        </p>
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

  return (
    <div className="container-app py-12">
      <div className="max-w-2xl mx-auto text-center">
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
          <Link to="/products" className="btn btn-outline">
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
};

export default OrderSuccess;
