/**
 * Order progress: Placed → Confirmed → Packed → Shipped → Delivered, with the
 * date each step happened (from statusHistory). Cancelled orders show where
 * they stopped.
 */
import { Check, X } from "lucide-react";
import { formatDateTime } from "../utils/helpers";
import type { IOrder, OrderStatus } from "../types";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "pending", label: "Placed" },
  { status: "confirmed", label: "Confirmed" },
  { status: "processing", label: "Packed" },
  { status: "shipped", label: "Shipped" },
  { status: "delivered", label: "Delivered" },
];

const OrderStatusStepper = ({ order, className = "" }: { order: IOrder; className?: string }) => {
  const status = (order.orderStatus ?? order.status ?? "pending") as OrderStatus;
  const history = order.statusHistory || [];
  const when = (s: OrderStatus) => {
    if (s === "pending") return order.createdAt;
    const entry = [...history].reverse().find((h) => h.status === s);
    return entry?.changedAt || entry?.timestamp;
  };

  const cancelled = status === "cancelled";
  // Furthest step reached (for cancelled orders: the last step before cancelling)
  const reached = cancelled
    ? Math.max(0, ...history.map((h) => STEPS.findIndex((step) => step.status === h.status)).filter((i) => i >= 0))
    : STEPS.findIndex((step) => step.status === status);
  const cancelledAt = cancelled ? [...history].reverse().find((h) => h.status === "cancelled") : undefined;

  return (
    <div className={className}>
      <ol className="flex sm:items-start flex-col sm:flex-row gap-4 sm:gap-0" aria-label="Order progress">
        {STEPS.map((step, i) => {
          const done = i <= reached && !(cancelled && i > reached);
          const current = !cancelled && i === reached;
          const date = done ? when(step.status) : undefined;
          return (
            <li
              key={step.status}
              aria-current={current ? "step" : undefined}
              className="relative flex sm:flex-col items-center sm:flex-1 gap-3 sm:gap-2 sm:text-center"
            >
              {/* connector */}
              {i < STEPS.length - 1 && (
                <span
                  aria-hidden="true"
                  className={`hidden sm:block absolute top-3.5 left-1/2 w-full h-0.5 ${
                    i < reached && !cancelled ? "bg-[var(--color-primary)]" : i < reached ? "bg-[var(--color-primary-light)]" : "bg-[var(--color-border)]"
                  }`}
                />
              )}
              <span
                className={`relative z-10 w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-semibold ${
                  done
                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                    : "bg-[var(--color-surface)] border-2 border-[var(--color-border-strong)] text-[var(--color-text-muted)]"
                } ${current ? "ring-4 ring-[var(--color-primary-soft)]" : ""}`}
              >
                {done ? <Check className="w-4 h-4" aria-hidden="true" /> : i + 1}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm ${done ? "font-medium" : "text-[var(--color-text-muted)]"}`}>
                  {step.label}
                  <span className="sr-only">{done ? " — done" : " — not yet"}</span>
                </span>
                {date && <span className="block text-xs text-[var(--color-text-muted)]">{formatDateTime(date)}</span>}
              </span>
            </li>
          );
        })}
      </ol>

      {cancelled && (
        <p className="mt-5 flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-200 text-sm">
          <X className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>
            Cancelled{cancelledAt?.changedAt ? ` on ${formatDateTime(cancelledAt.changedAt)}` : ""}
            {order.cancellationReason ? ` — ${order.cancellationReason}` : ""}
          </span>
        </p>
      )}
    </div>
  );
};

export default OrderStatusStepper;
