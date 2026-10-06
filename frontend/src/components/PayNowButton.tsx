/**
 * "Pay now" for an eSewa/Khalti order that hasn't been paid yet (retry after a
 * cancelled, failed or abandoned payment). Renders nothing for other orders.
 */
import { useState } from "react";
import { Loader2, CreditCard } from "lucide-react";
import toast from "react-hot-toast";
import { startOnlinePayment, canPayOnline } from "../utils/payment";
import { getErrorMessage } from "../utils/helpers";
import type { IOrder } from "../types";

interface PayNowButtonProps {
  order: IOrder;
  className?: string;
}

const PayNowButton = ({ order, className = "" }: PayNowButtonProps) => {
  const [loading, setLoading] = useState(false);

  if (!canPayOnline(order)) return null;
  const method = (order.payment?.method ?? order.paymentMethod) as "esewa" | "khalti";

  const handlePay = async () => {
    setLoading(true);
    try {
      await startOnlinePayment(order._id, method);
      // The browser is leaving for the payment page
    } catch (error) {
      toast.error(getErrorMessage(error, "Could not open the payment page"));
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handlePay}
      disabled={loading}
      className={`btn btn-primary flex items-center justify-center gap-2 ${className}`}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
      Pay now with {method === "esewa" ? "eSewa" : "Khalti"}
    </button>
  );
};

export default PayNowButton;
