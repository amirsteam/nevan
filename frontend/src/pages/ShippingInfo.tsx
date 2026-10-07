/**
 * Shipping Info Page
 * Shipping policy and delivery information
 */
import { Link } from "react-router-dom";
import { Truck, Clock, MapPin, Package, CheckCircle } from "lucide-react";
import { FREE_SHIPPING_THRESHOLD, SHIPPING_ZONES } from "../config/store";
import { formatPrice } from "../utils/helpers";
import { usePageTitle } from "../hooks/usePageTitle";

const minShipping = Math.min(...SHIPPING_ZONES.map((z) => z.cost));
const maxShipping = Math.max(...SHIPPING_ZONES.map((z) => z.cost));

const ShippingInfo = () => {
  usePageTitle("Shipping information", `Delivery times and costs across Nepal. Free shipping on orders over NPR ${FREE_SHIPPING_THRESHOLD.toLocaleString()}.`);
  return (
    <div className="container-app py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6">
        <Link to="/" className="hover:text-[var(--color-primary)]">Home</Link>
        <span>/</span>
        <span className="text-[var(--color-text)]">Shipping Information</span>
      </nav>

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">
            Shipping Information
          </h1>
          <p className="text-[var(--color-text-muted)]">
            Delivery across Nepal, free on orders over {formatPrice(FREE_SHIPPING_THRESHOLD)}.
          </p>
        </div>

        {/* Highlights */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="card p-5 text-center">
            <Truck className="w-8 h-8 text-[var(--color-primary)] mx-auto mb-3" aria-hidden="true" />
            <h2 className="font-semibold text-sm mb-1 font-sans">Free shipping over {formatPrice(FREE_SHIPPING_THRESHOLD)}</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Otherwise {formatPrice(minShipping)}–{formatPrice(maxShipping)} by location
            </p>
          </div>
          <div className="card p-5 text-center">
            <Clock className="w-8 h-8 text-[var(--color-primary)] mx-auto mb-3" aria-hidden="true" />
            <h2 className="font-semibold text-sm mb-1 font-sans">3–5 business days</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Inside Kathmandu Valley
            </p>
          </div>
          <div className="card p-5 text-center">
            <Package className="w-8 h-8 text-[var(--color-primary)] mx-auto mb-3" aria-hidden="true" />
            <h2 className="font-semibold text-sm mb-1 font-sans">Careful packaging</h2>
            <p className="text-xs text-[var(--color-text-muted)]">
              Gift-ready, eco-friendly wrapping
            </p>
          </div>
        </div>

        {/* Delivery Zones */}
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />
            Delivery zones, times and costs
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th scope="col" className="text-left py-3 pr-3 font-semibold">Zone</th>
                  <th scope="col" className="text-left py-3 pr-3 font-semibold">Delivery time</th>
                  <th scope="col" className="text-right py-3 font-semibold">Shipping</th>
                </tr>
              </thead>
              <tbody>
                {SHIPPING_ZONES.map((zone) => (
                  <tr key={zone.zone} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-3 pr-3">{zone.zone}</td>
                    <td className="py-3 pr-3 whitespace-nowrap">{zone.delivery}</td>
                    <td className="py-3 text-right font-medium whitespace-nowrap">{formatPrice(zone.cost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 rounded-lg bg-[var(--color-accent)]/15 px-4 py-3 text-sm">
            <strong>Free shipping</strong> on every order of {formatPrice(FREE_SHIPPING_THRESHOLD)} or more, anywhere in
            Nepal. The exact cost is shown at checkout before you pay.
          </p>
        </div>

        {/* How It Works */}
        <div className="card p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">How It Works</h2>
          <div className="space-y-4">
            {[
              {
                step: "1",
                title: "Place Your Order",
                desc: "Choose your items, select size and color, and proceed to checkout.",
              },
              {
                step: "2",
                title: "Order Confirmation",
                desc: "You'll receive an email confirmation with your order details.",
              },
              {
                step: "3",
                title: "Handcrafted & Packed",
                desc: "Your items are carefully inspected and packed with love.",
              },
              {
                step: "4",
                title: "On Its Way!",
                desc: "We ship via trusted courier partners. Track your order from your account.",
              },
              {
                step: "5",
                title: "Delivered!",
                desc: "Your package arrives at your doorstep. Pay on delivery if you chose COD.",
              },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-medium text-sm">{item.title}</h3>
                  <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {item.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Important Notes */}
        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">Important Notes</h2>
          <ul className="space-y-3">
            {[
              "Delivery times are estimates and may vary during festivals or adverse weather.",
              "Someone must be available at the delivery address to receive the package.",
              "For COD orders, please keep the exact amount ready for the delivery person.",
              "If you need to change your delivery address, please contact us within 24 hours of placing the order.",
            ].map((note, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-[var(--color-text-muted)]">
                <CheckCircle className="w-4 h-4 text-[var(--color-primary)] mt-0.5 flex-shrink-0" />
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ShippingInfo;
