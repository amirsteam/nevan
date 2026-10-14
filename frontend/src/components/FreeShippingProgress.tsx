/**
 * "Add NPR X more for free shipping" progress (cart, checkout)
 */
import { Truck } from "lucide-react";
import { formatPrice } from "../utils/helpers";
import { useShippingSettings } from "../hooks/useShippingSettings";

const FreeShippingProgress = ({ subtotal, className = "" }: { subtotal: number; className?: string }) => {
  const { freeShippingThreshold } = useShippingSettings();
  const remaining = Math.max(0, freeShippingThreshold - subtotal);
  const percent = freeShippingThreshold > 0 ? Math.min(100, Math.round((subtotal / freeShippingThreshold) * 100)) : 100;

  return (
    <div className={`rounded-lg bg-[var(--color-primary-soft)] p-3 ${className}`}>
      <p className="flex items-center gap-2 text-sm">
        <Truck className="w-4 h-4 text-[var(--color-primary)] shrink-0" aria-hidden="true" />
        {remaining > 0 ? (
          <span>
            Add <strong>{formatPrice(remaining)}</strong> more for <strong>free shipping</strong>
          </span>
        ) : (
          <span className="font-medium">You've unlocked free shipping 🎉</span>
        )}
      </p>
      <div
        className="mt-2 h-1.5 rounded-full bg-[var(--color-surface)] overflow-hidden"
        role="progressbar"
        aria-label="Progress to free shipping"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <div className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

export default FreeShippingProgress;
