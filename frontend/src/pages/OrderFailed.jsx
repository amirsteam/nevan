/**
 * Order Failed Page
 * Handles failed or cancelled payments
 */
import { useSearchParams, Link } from "react-router-dom";
import { XCircle, RefreshCw, ShoppingCart } from "lucide-react";

const OrderFailed = () => {
  const [searchParams] = useSearchParams();

  const orderId = searchParams.get("orderId");
  const message =
    searchParams.get("message") || "Your payment could not be processed";
  const gateway = searchParams.get("gateway");

  return (
    <div className="container-app py-12">
      <div className="max-w-lg mx-auto text-center">
        {/* Failure Icon */}
        <div className="mb-6">
          <XCircle className="w-20 h-20 mx-auto text-[var(--color-error)]" />
        </div>

        {/* Failure Message */}
        <h1 className="text-3xl font-bold text-[var(--color-error)] mb-2">
          Payment Failed
        </h1>
        <p className="text-[var(--color-text-muted)] mb-2">
          {decodeURIComponent(message)}
        </p>
        {gateway && (
          <p className="text-sm text-[var(--color-text-muted)] mb-8">
            Payment gateway: <span className="capitalize">{gateway}</span>
          </p>
        )}

        {/* Info Card */}
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
            <strong>Good news:</strong> Your cart items are still saved. You can
            try again.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          {orderId ? (
            <Link
              to={`/orders/${orderId}`}
              className="btn btn-primary flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Retry Payment
            </Link>
          ) : (
            <Link
              to="/checkout"
              className="btn btn-primary flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Link>
          )}
          <Link
            to="/cart"
            className="btn btn-outline flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-4 h-4" />
            View Cart
          </Link>
        </div>

        {/* Contact Support */}
        <p className="mt-8 text-sm text-[var(--color-text-muted)]">
          Need help? Contact us at{" "}
          <a
            href="mailto:support@nevanhandicraft.com"
            className="text-[var(--color-primary)] hover:underline"
          >
            support@nevanhandicraft.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default OrderFailed;
