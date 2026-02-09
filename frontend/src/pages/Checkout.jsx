/**
 * Checkout Page
 * Handles shipping address input and order placement with payment gateways
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { selectCart, resetCart } from "../store/cartSlice";
import { useAuth } from "../context/AuthContext";
import { ordersAPI, paymentsAPI } from "../api/orders";
import { formatPrice } from "../utils/helpers";
import toast from "react-hot-toast"; // Assuming toast is available
import {
  Loader2,
  MapPin,
  Truck,
  CreditCard,
  Banknote,
  ShieldCheck,
  Gift,
} from "lucide-react";

// Province names mapping for Nepal
const PROVINCES = {
  1: "Koshi Pradesh",
  2: "Madhesh Pradesh",
  3: "Bagmati Pradesh",
  4: "Gandaki Pradesh",
  5: "Lumbini Pradesh",
  6: "Karnali Pradesh",
  7: "Sudurpashchim Pradesh",
};

const Checkout = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useAuth();
  const cart = useSelector(selectCart);

  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState("cod");
  const [showQRModal, setShowQRModal] = useState(false);
  const [pendingOrderId, setPendingOrderId] = useState(null);

  // Flag to prevent empty cart redirect after successful order
  const orderPlacedRef = useRef(false);

  // Shipping Address State
  const [shipping, setShipping] = useState({
    name: "",
    street: "",
    city: "",
    district: "",
    province: "3", // Default to Bagmati
    phone: "",
  });

  // Gift / order notes
  const [customerNotes, setCustomerNotes] = useState("");
  const [isGift, setIsGift] = useState(false);

  // Load available payment methods
  useEffect(() => {
    const loadMethods = async () => {
      try {
        const response = await paymentsAPI.getMethods();
        if (response.data?.methods) {
          setPaymentMethods(response.data.methods);
        }
      } catch (error) {
        console.error("Failed to load payment methods", error);
        // Fallback to COD if API fails
        setPaymentMethods([
          {
            id: "cod",
            name: "Cash on Delivery",
            description: "Pay upon delivery",
          },
        ]);
      }
    };
    loadMethods();
  }, []);

  // Load user defaults
  useEffect(() => {
    if (user) {
      setShipping({
        name: user.name || "",
        street: user.addresses?.[0]?.street || "",
        city: user.addresses?.[0]?.city || "",
        district: user.addresses?.[0]?.district || "",
        province: user.addresses?.[0]?.province || "3",
        phone: user.phone || "",
      });
    }
  }, [user]);

  // Redirect if cart is empty (but not after successful order)
  useEffect(() => {
    if (!orderPlacedRef.current && !cart.loading && cart.items.length === 0) {
      toast.error("Your cart is empty");
      navigate("/cart");
    }
  }, [cart.items, cart.loading, navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShipping((prev) => ({ ...prev, [name]: value }));
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();

    if (
      !shipping.name ||
      !shipping.street ||
      !shipping.city ||
      !shipping.district ||
      !shipping.phone
    ) {
      toast.error("Please fill in all shipping details");
      return;
    }

    if (!shipping.province) {
      toast.error("Please select a province");
      return;
    }

    // Validate phone number format
    const phoneRegex = /^(\+977)?[0-9]{10}$/;
    if (!phoneRegex.test(shipping.phone.replace(/[\s-]/g, ""))) {
      toast.error("Please enter a valid phone number (e.g., 98XXXXXXXX)");
      return;
    }

    setLoading(true);

    try {
      // 1. Create Order
      const orderPayload = {
        shippingAddress: {
          ...shipping,
          province: parseInt(shipping.province),
        },
        paymentMethod: selectedPayment,
        itemsFromCart: true, // Explicitly state we are using cart items
        customerNotes: isGift
          ? `🎁 Gift Order: ${customerNotes}`.trim()
          : customerNotes || undefined,
      };

      const orderRes = await ordersAPI.createOrder(orderPayload);
      const orderId = orderRes?.data?.order?._id || orderRes?.data?._id;

      if (!orderId) throw new Error("Failed to create order ID");

      // 2. Initiate Payment
      const paymentRes = await paymentsAPI.initiatePayment(
        orderId,
        selectedPayment,
      );
      const paymentData = paymentRes.data;

      if (selectedPayment === "cod") {
        // COD: order is placed, go straight to success
        orderPlacedRef.current = true;
        dispatch(resetCart());
        navigate(`/order-success?orderId=${orderId}`);
        setLoading(false);
      } else if (selectedPayment === "esewa") {
        // Handle eSewa form submission
        // Backend returns redirectUrl (e.g. https://rc-epay.esewa.com.np/api/epay/main/v2/form)
        const url = paymentData.redirectUrl || paymentData.url;
        if (paymentData.formData && url) {
          const form = document.createElement("form");
          form.method = "POST";
          form.action = url;

          Object.keys(paymentData.formData).forEach((key) => {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = key;
            input.value = paymentData.formData[key];
            form.appendChild(input);
          });

          document.body.appendChild(form);
          form.submit();
        } else {
          throw new Error("Invalid eSewa configuration");
        }
      } else if (selectedPayment === "khalti") {
        // Handle Khalti redirect
        const url =
          paymentData.redirectUrl || paymentData.payment_url || paymentData.url;
        if (url) {
          window.location.href = url;
        } else {
          throw new Error("Invalid Khalti configuration: URL missing");
        }
      }
    } catch (error) {
      console.error("Checkout failed:", error);

      // Handle Axios error format
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to place order";
      if (error.response?.data) {
        console.error("SERVER ERROR DETAIL:", error.response.data);
        const serverMsg =
          error.response.data.message || error.response.data.error;
        if (serverMsg) {
          toast.error(`Error: ${serverMsg}`);
          return;
        }
      }

      if (error.response?.data?.errors) {
        // Validation errors array
        const validationMsg = error.response.data.errors
          .map((e) => e.message)
          .join(", ");
        toast.error(validationMsg);
      } else {
        toast.error(error.message || "Checkout failed");
      }
    } finally {
      setLoading(false);
    }
  };

  if (cart.items.length === 0 && !orderPlacedRef.current) return null;

  const shippingCost = 0; // Hardcoded free shipping for now or fetch from logic
  const total = cart.subtotal + shippingCost;

  return (
    <div className="container-app py-8">
      <h1 className="text-2xl font-bold mb-8">Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Shipping & Payment */}
        <div className="lg:col-span-2 space-y-8">
          {/* Shipping Address */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="text-[var(--color-primary)] w-5 h-5" />
              <h2 className="text-lg font-semibold">Shipping Address</h2>
            </div>

            <form
              id="checkout-form"
              onSubmit={handlePlaceOrder}
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={shipping.name}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="Enter recipient name"
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">
                  Street Address
                </label>
                <input
                  type="text"
                  name="street"
                  value={shipping.street}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="House No, Street Name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">City</label>
                <input
                  type="text"
                  name="city"
                  value={shipping.city}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="City"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  District
                </label>
                <input
                  type="text"
                  name="district"
                  value={shipping.district}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="District"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Province
                </label>
                <select
                  name="province"
                  value={shipping.province}
                  onChange={handleInputChange}
                  className="input w-full"
                  required
                >
                  {Object.entries(PROVINCES).map(([num, name]) => (
                    <option key={num} value={num}>
                      {name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={shipping.phone}
                  onChange={handleInputChange}
                  className="input w-full"
                  placeholder="98XXXXXXXX"
                  required
                />
              </div>
            </form>
          </div>

          {/* Gift Message / Order Notes */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <Gift className="text-[var(--color-primary)] w-5 h-5" />
              <h2 className="text-lg font-semibold">Gift Options & Notes</h2>
            </div>

            <label className="flex items-center gap-3 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={isGift}
                onChange={(e) => setIsGift(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
              />
              <span className="text-sm font-medium">This order is a gift 🎁</span>
            </label>

            <textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder={isGift ? "Add a gift message (e.g., Happy Birthday little one! 💛)" : "Any special instructions for your order? (optional)"}
              rows={3}
              maxLength={500}
              className="input w-full resize-none"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1 text-right">
              {customerNotes.length}/500
            </p>
          </div>

          {/* Payment Methods */}
          <div className="card p-6">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="text-[var(--color-primary)] w-5 h-5" />
              <h2 className="text-lg font-semibold">Payment Method</h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {paymentMethods
                .filter((method) => method.id !== "khalti")
                .map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setSelectedPayment(method.id)}
                    className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 transition-all ${
                      selectedPayment === method.id
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-light)]/10 text-[var(--color-primary)]"
                        : "border-[var(--color-border)] hover:border-[var(--color-primary)]/50"
                    }`}
                  >
                    {method.id === "esewa" ? (
                      <div className="w-12 h-8 bg-green-500 rounded flex items-center justify-center text-white font-bold text-xs">
                        eSewa
                      </div>
                    ) : (
                      <Banknote className="w-8 h-8" />
                    )}
                    <span className="font-medium">{method.name}</span>
                  </button>
                ))}
            </div>

            <div className="mt-4 p-4 bg-[var(--color-bg)] rounded-lg text-sm text-[var(--color-text-muted)]">
              <p className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" />
                {selectedPayment === "cod"
                  ? "Pay with cash upon delivery. No extra charges."
                  : "You will be redirected to eSewa to complete your payment securely."}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="text-lg font-semibold mb-4">Order Summary</h2>

            <div className="space-y-4 max-h-[300px] overflow-y-auto mb-4 pr-1">
              {cart.items.map((item) => (
                <div key={item._id} className="flex gap-3 text-sm">
                  <img
                    src={
                      item.variant?.image ||
                      item.product?.images?.[0]?.url ||
                      "/placeholder.jpg"
                    }
                    alt={item.product?.name}
                    className="w-12 h-12 rounded object-cover"
                  />
                  <div className="flex-1">
                    <p className="font-medium line-clamp-1">
                      {item.product?.name}
                    </p>
                    <p className="text-[var(--color-text-muted)] text-xs">
                      Qty: {item.quantity}
                      {item.variant &&
                        ` • ${item.variant.size} - ${item.variant.color}`}
                      {item.selectedVariants
                        ?.map((v) => `, ${v.optionValue}`)
                        .join("")}
                    </p>
                  </div>
                  <p className="font-medium whitespace-nowrap">
                    {formatPrice(
                      (item.currentPrice || item.price) * item.quantity,
                    )}
                  </p>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--color-border)] pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Subtotal</span>
                <span>{formatPrice(cart.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-muted)]">Shipping</span>
                <span>
                  {shippingCost === 0 ? "Free" : formatPrice(shippingCost)}
                </span>
              </div>
              <div className="flex justify-between font-bold text-lg pt-2 border-t border-[var(--color-border)]">
                <span>Total</span>
                <span className="text-[var(--color-primary)]">
                  {formatPrice(total)}
                </span>
              </div>
            </div>

            <button
              type="submit"
              form="checkout-form"
              disabled={loading}
              className="btn btn-primary w-full mt-6 py-3 flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Place Order"
              )}
            </button>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]">
              <Truck className="w-3 h-3" />
              <span>Fast Delivery within 3-5 days</span>
            </div>
          </div>
        </div>
      </div>

      {/* eSewa QR Modal (fallback for manual payment) */}
      {showQRModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
            <button
              onClick={() => {
                setShowQRModal(false);
                orderPlacedRef.current = true;
                dispatch(resetCart());
                navigate(`/order-success?orderId=${pendingOrderId}`);
              }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
            >
              <span className="text-xl text-gray-600">&times;</span>
            </button>

            <h3 className="text-xl font-bold text-center mb-4">
              Complete Payment via eSewa
            </h3>

            <div className="flex justify-center mb-4">
              <img
                src="/esewaQR.png"
                alt="eSewa QR Code"
                className="max-w-[250px] w-full h-auto rounded-lg border"
              />
            </div>

            <p className="text-center text-gray-700 text-sm leading-relaxed">
              Please scan the QR code to pay and share the payment details to
              WhatsApp number{" "}
              <a
                href="https://wa.me/9779844575932"
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 font-semibold hover:underline"
              >
                +977 9844575932
              </a>
              . Thank you!
            </p>

            <button
              onClick={() => {
                setShowQRModal(false);
                orderPlacedRef.current = true;
                dispatch(resetCart());
                navigate(`/order-success?orderId=${pendingOrderId}`);
              }}
              className="btn btn-primary w-full mt-6 py-3"
            >
              Close & Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
