/**
 * Checkout Page
 * Three steps on one page (address → payment → review): saved addresses,
 * inline validation, a delivery-zone note with the real shipping cost,
 * payment method cards, and a collapsible summary on phones.
 */
import { useState, useEffect, useRef, useMemo, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Loader2, MapPin, Truck, Banknote, ShieldCheck, Gift, Check, Plus, ChevronDown, Lock } from "lucide-react";
import { selectCart, resetCart } from "../store/cartSlice";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import { useAuth } from "../context/AuthContext";
import { ordersAPI, paymentsAPI } from "../api/orders";
import { authAPI } from "../api/auth";
import { formatPrice, calculateShippingCost, getErrorMessage } from "../utils/helpers";
import { imageUrl } from "../utils/image";
import { startOnlinePayment } from "../utils/payment";
import { DISTRICTS_BY_PROVINCE, PROVINCE_NAMES, NEPALI_MOBILE, normalizePhone } from "../utils/nepal";
import { deliveryEstimateFor, FREE_SHIPPING_THRESHOLD } from "../config/store";
import { usePageTitle } from "../hooks/usePageTitle";
import FreeShippingProgress from "../components/FreeShippingProgress";
import type { IPaymentMethod, ISavedAddress, PaymentMethod } from "../types";

interface ShippingForm {
  name: string;
  phone: string;
  street: string;
  city: string;
  district: string;
  province: string;
  landmark: string;
}

type FieldErrors = Partial<Record<keyof ShippingForm, string>>;

const EMPTY_FORM: ShippingForm = { name: "", phone: "", street: "", city: "", district: "", province: "3", landmark: "" };

const validate = (form: ShippingForm): FieldErrors => {
  const errors: FieldErrors = {};
  if (!form.name.trim()) errors.name = "Enter the recipient's name";
  if (!NEPALI_MOBILE.test(normalizePhone(form.phone))) errors.phone = "Enter a 10-digit mobile number starting with 98 or 97";
  if (!form.street.trim()) errors.street = "Enter the street or tole";
  if (!form.city.trim()) errors.city = "Enter the city or municipality";
  if (!form.district) errors.district = "Choose a district";
  if (!form.province) errors.province = "Choose a province";
  return errors;
};

const fromSaved = (a: ISavedAddress): ShippingForm => ({
  name: a.name,
  phone: a.phone,
  street: a.street,
  city: a.city,
  district: a.district,
  province: String(a.province),
  landmark: a.landmark || "",
});

const PAYMENT_DETAILS: Record<string, { title: string; note: string; logo?: string }> = {
  cod: { title: "Cash on delivery", note: "Pay in cash when your order arrives. No extra charge." },
  esewa: { title: "eSewa", note: "You'll be taken to eSewa to pay securely, then brought back here.", logo: "/esewa.png" },
  khalti: { title: "Khalti", note: "You'll be taken to Khalti to pay securely.", logo: "/khalti.png" },
};

const Step = ({ n, title, done, active }: { n: number; title: string; done: boolean; active: boolean }) => (
  <li className="flex items-center gap-2 min-w-0" aria-current={active ? "step" : undefined}>
    <span
      className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-sm font-semibold ${
        done
          ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
          : active
            ? "border-2 border-[var(--color-primary)] text-[var(--color-primary)]"
            : "border border-[var(--color-border-strong)] text-[var(--color-text-muted)]"
      }`}
    >
      {done ? <Check className="w-4 h-4" aria-hidden="true" /> : n}
    </span>
    <span className={`text-sm truncate ${active || done ? "font-medium" : "text-[var(--color-text-muted)]"}`}>
      {title}
      {done && <span className="sr-only"> (done)</span>}
    </span>
  </li>
);

const Checkout = () => {
  usePageTitle("Checkout");
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAuth();
  const cart = useAppSelector(selectCart);

  const [loading, setLoading] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethod[]>([]);
  const [selectedPayment, setSelectedPayment] = useState<PaymentMethod>("cod");
  const [savedAddresses, setSavedAddresses] = useState<ISavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | "new">("new");
  const [shipping, setShipping] = useState<ShippingForm>(EMPTY_FORM);
  const [touched, setTouched] = useState<Partial<Record<keyof ShippingForm, boolean>>>({});
  const [saveAddress, setSaveAddress] = useState(true);
  const [customerNotes, setCustomerNotes] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const orderPlacedRef = useRef(false);

  useEffect(() => {
    paymentsAPI
      .getMethods()
      .then((response) => setPaymentMethods(response.data?.methods?.length ? response.data.methods : [{ id: "cod", name: "Cash on Delivery", description: "" }]))
      .catch(() => setPaymentMethods([{ id: "cod", name: "Cash on Delivery", description: "Pay upon delivery" }]));
  }, []);

  // Saved addresses: start from the default one
  useEffect(() => {
    let cancelled = false;
    Promise.resolve()
      .then(() => authAPI.getAddresses())
      .then((res) => {
        if (cancelled) return;
        const list = res?.data?.addresses || [];
        setSavedAddresses(list);
        const preferred = list.find((a) => a.isDefault) || list[0];
        if (preferred) {
          setSelectedAddressId(preferred._id);
          setShipping(fromSaved(preferred));
          setSaveAddress(false);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  // Prefill a new address from the profile
  useEffect(() => {
    if (user) {
      setShipping((prev) => ({ ...prev, name: prev.name || user.name || "", phone: prev.phone || user.phone || "" }));
    }
  }, [user]);

  // Redirect if the cart is empty — only once it has actually been loaded. On a
  // full page load (e.g. Back from eSewa) the store starts empty until fetched.
  useEffect(() => {
    if (!orderPlacedRef.current && cart.hasLoaded && !cart.loading && cart.items.length === 0) {
      toast.error("Your cart is empty");
      navigate("/cart");
    }
  }, [cart.items, cart.loading, cart.hasLoaded, navigate]);

  // Back from the gateway can restore this page from bfcache with "Placing order…" still on
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setLoading(false);
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const errors = useMemo(() => validate(shipping), [shipping]);
  const addressValid = Object.keys(errors).length === 0;
  const showError = (field: keyof ShippingForm) => (touched[field] || submitted) && errors[field];
  const usingSaved = selectedAddressId !== "new";

  const setField = (field: keyof ShippingForm, value: string) =>
    setShipping((prev) => ({ ...prev, [field]: value, ...(field === "province" ? { district: "" } : {}) }));

  const chooseAddress = (id: string | "new") => {
    setSelectedAddressId(id);
    if (id === "new") {
      setShipping({ ...EMPTY_FORM, name: user?.name || "", phone: user?.phone || "" });
      setTouched({});
      setSaveAddress(savedAddresses.length < 5);
    } else {
      const found = savedAddresses.find((a) => a._id === id);
      if (found) setShipping(fromSaved(found));
    }
  };

  const handlePlaceOrder = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    if (!addressValid) {
      if (usingSaved) setSelectedAddressId("new");
      toast.error("Please check your delivery details");
      const firstInvalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      firstInvalid?.focus();
      return;
    }

    setLoading(true);
    const address = {
      name: shipping.name.trim(),
      phone: normalizePhone(shipping.phone),
      street: shipping.street.trim(),
      city: shipping.city.trim(),
      district: shipping.district,
      province: parseInt(shipping.province, 10),
      ...(shipping.landmark.trim() ? { landmark: shipping.landmark.trim() } : {}),
    };

    try {
      const orderRes = await ordersAPI.createOrder({
        shippingAddress: address,
        paymentMethod: selectedPayment,
        customerNotes: isGift ? `🎁 Gift Order: ${customerNotes}`.trim() : customerNotes || undefined,
      });
      const orderId = orderRes?.data?.order?._id;
      if (!orderId) throw new Error("Failed to create order ID");

      // Remember the address for next time (never blocks the order)
      if (!usingSaved && saveAddress) {
        authAPI.addAddress({ ...address, label: savedAddresses.length === 0 ? "Home" : undefined }).catch(() => {});
      }

      if (selectedPayment === "cod") {
        // COD: the API emptied the cart when it created the order
        await paymentsAPI.initiatePayment(orderId, "cod");
        orderPlacedRef.current = true;
        dispatch(resetCart());
        navigate(`/order-success?orderId=${orderId}`);
        setLoading(false);
        return;
      }

      // eSewa/Khalti: the cart is kept until the payment is confirmed. If starting
      // the payment fails, the order already exists — send the shopper to it so
      // they can retry instead of placing a duplicate order.
      try {
        await startOnlinePayment(orderId, selectedPayment);
      } catch (paymentError) {
        toast.error(getErrorMessage(paymentError, "Could not open the payment page. You can retry from your order."));
        orderPlacedRef.current = true;
        navigate(`/orders/${orderId}`);
        setLoading(false);
      }
      // On success the browser is leaving for the gateway; keep the button disabled
    } catch (error) {
      toast.error(getErrorMessage(error, "Failed to place order"));
      setLoading(false);
    }
  };

  if (!cart.hasLoaded) {
    return (
      <div className="flex items-center justify-center py-20" role="status">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-primary)]" aria-hidden="true" />
        <span className="sr-only">Loading checkout…</span>
      </div>
    );
  }

  if (cart.items.length === 0 && !orderPlacedRef.current) return null;

  const province = parseInt(shipping.province, 10);
  // Same rule the API uses when it creates the order
  const shippingCost = calculateShippingCost(cart.subtotal, province, shipping.district);
  const total = cart.subtotal + shippingCost;
  const visibleMethods = paymentMethods.filter((method) => method.id !== "khalti");
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  const disabledReason = !addressValid ? "Complete your delivery details to place the order." : null;

  const field = (name: keyof ShippingForm, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, span = false) => (
    <div className={span ? "sm:col-span-2" : ""}>
      <label htmlFor={`ship-${name}`} className="block text-sm font-medium mb-1">
        {label}
      </label>
      <input
        id={`ship-${name}`}
        name={name}
        value={shipping[name]}
        onChange={(e) => setField(name, e.target.value)}
        onBlur={() => setTouched((t) => ({ ...t, [name]: true }))}
        aria-invalid={!!showError(name)}
        aria-describedby={showError(name) ? `ship-${name}-error` : undefined}
        className="input"
        {...props}
      />
      {showError(name) && (
        <p id={`ship-${name}-error`} className="text-xs text-[var(--color-error)] mt-1">
          {errors[name]}
        </p>
      )}
    </div>
  );

  const summaryItems = (
    <ul className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
      {cart.items.map((item) => (
        <li key={item._id} className="flex gap-3 text-sm">
          <div className="relative shrink-0">
            <img
              src={imageUrl(item.variant?.image || item.product?.images?.[0]?.url, 96)}
              alt=""
              className="w-12 h-12 rounded-lg object-cover bg-[var(--color-surface-muted)]"
            />
            <span className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 rounded-full bg-[var(--color-text)] text-[var(--color-surface)] text-xs flex items-center justify-center">
              {item.quantity}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium line-clamp-1">{item.product?.name}</p>
            {item.variant && (
              <p className="text-[var(--color-text-muted)] text-xs">
                {item.variant.size} · {item.variant.color}
              </p>
            )}
          </div>
          <p className="font-medium whitespace-nowrap">
            {formatPrice((item.currentPrice || item.priceAtAdd || item.product?.price || 0) * item.quantity)}
          </p>
        </li>
      ))}
    </ul>
  );

  const totals = (
    <dl className="space-y-2 text-sm">
      <div className="flex justify-between">
        <dt className="text-[var(--color-text-muted)]">Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</dt>
        <dd>{formatPrice(cart.subtotal)}</dd>
      </div>
      {cart.savings > 0 && (
        <div className="flex justify-between text-[var(--color-success)] font-medium">
          <dt>You save (sale)</dt>
          <dd>{formatPrice(cart.savings)}</dd>
        </div>
      )}
      <div className="flex justify-between">
        <dt className="text-[var(--color-text-muted)]">Shipping{shipping.district ? ` to ${shipping.district}` : ""}</dt>
        <dd className={shippingCost === 0 ? "text-[var(--color-success)] font-medium" : ""}>
          {shippingCost === 0 ? "Free" : formatPrice(shippingCost)}
        </dd>
      </div>
      <div className="flex justify-between font-bold text-lg pt-2 border-t border-[var(--color-border)]">
        <dt>Total</dt>
        <dd className="text-[var(--color-primary)]">{formatPrice(total)}</dd>
      </div>
    </dl>
  );

  return (
    <div className="container-app py-6 md:py-8">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Checkout</h1>
        <Link to="/cart" className="text-sm text-[var(--color-primary)] hover:underline underline-offset-4">
          ← Back to cart
        </Link>
      </div>

      <ol className="grid grid-cols-3 gap-2 mb-6 max-w-xl" aria-label="Checkout steps">
        <Step n={1} title="Delivery" done={addressValid} active={!addressValid} />
        <Step n={2} title="Payment" done={addressValid && !!selectedPayment} active={addressValid} />
        <Step n={3} title="Review" done={false} active={false} />
      </ol>

      {/* Phone: collapsible summary */}
      <details className="lg:hidden card mb-6 group">
        <summary className="flex items-center justify-between gap-3 p-4 cursor-pointer list-none">
          <span className="flex items-center gap-2 text-sm font-medium">
            <ChevronDown className="w-4 h-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            Order summary ({itemCount})
          </span>
          <span className="font-bold text-[var(--color-primary)]">{formatPrice(total)}</span>
        </summary>
        <div className="px-4 pb-4 space-y-4 border-t border-[var(--color-border)] pt-4">
          {summaryItems}
          {totals}
        </div>
      </details>

      <form id="checkout-form" onSubmit={handlePlaceOrder} noValidate className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Delivery */}
          <section className="card p-5 md:p-6" aria-labelledby="delivery-heading">
            <h2 id="delivery-heading" className="text-lg font-semibold mb-4 flex items-center gap-2 font-sans">
              <MapPin className="text-[var(--color-primary)] w-5 h-5" aria-hidden="true" />
              Delivery address
            </h2>

            {savedAddresses.length > 0 && (
              <fieldset className="mb-5">
                <legend className="sr-only">Choose a saved address</legend>
                <div className="grid sm:grid-cols-2 gap-3">
                  {savedAddresses.map((a) => (
                    <label
                      key={a._id}
                      className={`relative flex gap-3 p-3 rounded-xl border-2 cursor-pointer text-sm ${
                        selectedAddressId === a._id ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : "border-[var(--color-border)] hover:border-[var(--color-primary-light)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="saved-address"
                        checked={selectedAddressId === a._id}
                        onChange={() => chooseAddress(a._id)}
                        className="mt-1 accent-[var(--color-primary)]"
                      />
                      <span className="min-w-0">
                        <span className="font-medium block">
                          {a.label || a.name}
                          {a.isDefault && <span className="ml-2 text-xs font-normal text-[var(--color-text-muted)]">Default</span>}
                        </span>
                        <span className="block text-[var(--color-text-muted)] truncate">
                          {a.name} · {a.phone}
                        </span>
                        <span className="block text-[var(--color-text-muted)] truncate">
                          {a.street}, {a.city}, {a.district}
                        </span>
                      </span>
                    </label>
                  ))}
                  <label
                    className={`flex items-center gap-3 p-3 rounded-xl border-2 border-dashed cursor-pointer text-sm ${
                      selectedAddressId === "new" ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : "border-[var(--color-border)] hover:border-[var(--color-primary-light)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="saved-address"
                      checked={selectedAddressId === "new"}
                      onChange={() => chooseAddress("new")}
                      className="accent-[var(--color-primary)]"
                    />
                    <Plus className="w-4 h-4" aria-hidden="true" />
                    Deliver to a new address
                  </label>
                </div>
              </fieldset>
            )}

            {!usingSaved && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field("name", "Recipient's full name", { autoComplete: "name", required: true }, true)}
                {field("phone", "Mobile number", { type: "tel", inputMode: "tel", autoComplete: "tel", placeholder: "98XXXXXXXX", required: true })}
                <div>
                  <label htmlFor="ship-province" className="block text-sm font-medium mb-1">
                    Province
                  </label>
                  <select
                    id="ship-province"
                    value={shipping.province}
                    onChange={(e) => setField("province", e.target.value)}
                    className="select"
                    aria-invalid={!!showError("province")}
                  >
                    {Object.entries(PROVINCE_NAMES).map(([id, name]) => (
                      <option key={id} value={id}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="ship-district" className="block text-sm font-medium mb-1">
                    District
                  </label>
                  <select
                    id="ship-district"
                    value={shipping.district}
                    onChange={(e) => setField("district", e.target.value)}
                    onBlur={() => setTouched((t) => ({ ...t, district: true }))}
                    className="select"
                    aria-invalid={!!showError("district")}
                    aria-describedby={showError("district") ? "ship-district-error" : undefined}
                  >
                    <option value="">Choose district</option>
                    {(DISTRICTS_BY_PROVINCE[province] || []).map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                  {showError("district") && (
                    <p id="ship-district-error" className="text-xs text-[var(--color-error)] mt-1">
                      {errors.district}
                    </p>
                  )}
                </div>
                {field("city", "City / municipality", { autoComplete: "address-level2", required: true })}
                {field("street", "Street, tole or ward", { autoComplete: "street-address", placeholder: "e.g. Ward 5, Thamel Marg", required: true })}
                {field("landmark", "Landmark (optional)", { placeholder: "Near a school, temple…" }, true)}

                {savedAddresses.length < 5 && (
                  <label className="sm:col-span-2 flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="w-4 h-4 accent-[var(--color-primary)]" />
                    Save this address for next time
                  </label>
                )}
              </div>
            )}

            {shipping.district && (
              <p className="mt-4 flex items-start gap-2 text-sm p-3 rounded-lg bg-[var(--color-surface-muted)]">
                <Truck className="w-4 h-4 mt-0.5 text-[var(--color-primary)] shrink-0" aria-hidden="true" />
                <span>
                  Delivery to <strong>{shipping.district}</strong> usually takes <strong>{deliveryEstimateFor(province)}</strong>.{" "}
                  {shippingCost === 0
                    ? "Shipping is free on this order."
                    : `Shipping: ${formatPrice(shippingCost)} (free over ${formatPrice(FREE_SHIPPING_THRESHOLD)}).`}
                </span>
              </p>
            )}
          </section>

          {/* 2. Payment */}
          <section className="card p-5 md:p-6" aria-labelledby="payment-heading">
            <h2 id="payment-heading" className="text-lg font-semibold mb-4 flex items-center gap-2 font-sans">
              <Banknote className="text-[var(--color-primary)] w-5 h-5" aria-hidden="true" />
              Payment
            </h2>
            <div role="radiogroup" aria-labelledby="payment-heading" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {visibleMethods.map((method) => {
                const details = PAYMENT_DETAILS[method.id] || { title: method.name, note: method.description };
                const checked = selectedPayment === method.id;
                return (
                  <label
                    key={method.id}
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-colors ${
                      checked ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)]" : "border-[var(--color-border)] hover:border-[var(--color-primary-light)]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value={method.id}
                      checked={checked}
                      onChange={() => setSelectedPayment(method.id)}
                      className="mt-1 accent-[var(--color-primary)]"
                    />
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center justify-between gap-2">
                        <span className="font-medium">{details.title}</span>
                        {details.logo ? (
                          <img src={details.logo} alt="" className="h-6 w-auto object-contain rounded bg-white px-1" />
                        ) : (
                          <Banknote className="w-6 h-6 text-[var(--color-accent-strong)]" aria-hidden="true" />
                        )}
                      </span>
                      <span className="block text-xs text-[var(--color-text-muted)] mt-1">{details.note}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Notes */}
          <section className="card p-5 md:p-6" aria-labelledby="notes-heading">
            <h2 id="notes-heading" className="text-lg font-semibold mb-4 flex items-center gap-2 font-sans">
              <Gift className="text-[var(--color-primary)] w-5 h-5" aria-hidden="true" />
              Gift options &amp; notes
            </h2>
            <label className="flex items-center gap-3 mb-4 cursor-pointer">
              <input type="checkbox" checked={isGift} onChange={(e) => setIsGift(e.target.checked)} className="w-4 h-4 accent-[var(--color-primary)]" />
              <span className="text-sm font-medium">This order is a gift 🎁</span>
            </label>
            <label htmlFor="order-notes" className="sr-only">
              {isGift ? "Gift message" : "Order notes"}
            </label>
            <textarea
              id="order-notes"
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              placeholder={isGift ? "Add a gift message (e.g. Happy birthday, little one! 💛)" : "Any special instructions? (optional)"}
              rows={3}
              maxLength={500}
              className="textarea resize-none"
            />
            <p className="text-xs text-[var(--color-text-muted)] mt-1 text-right">{customerNotes.length}/500</p>
          </section>
        </div>

        {/* 3. Review */}
        <aside className="lg:col-span-1" aria-label="Review and place order">
          <div className="card p-5 md:p-6 lg:sticky lg:top-24 space-y-4">
            <h2 className="text-lg font-semibold font-sans">Review</h2>
            <div className="hidden lg:block">{summaryItems}</div>
            <FreeShippingProgress subtotal={cart.subtotal} />
            {totals}

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              aria-describedby={disabledReason && submitted ? "place-order-reason" : undefined}
              className="btn btn-primary w-full py-3 text-base"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" /> : <Lock className="w-4 h-4" aria-hidden="true" />}
              {loading ? "Placing order…" : selectedPayment === "cod" ? `Place order · ${formatPrice(total)}` : `Pay ${formatPrice(total)} with eSewa`}
            </button>
            {disabledReason && submitted && (
              <p id="place-order-reason" className="text-xs text-[var(--color-error)]" role="alert">
                {disabledReason}
              </p>
            )}
            <p className="flex items-center justify-center gap-2 text-xs text-[var(--color-text-muted)]">
              <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
              Prices and shipping are confirmed by our server when you order.
            </p>
          </div>
        </aside>
      </form>
    </div>
  );
};

export default Checkout;
