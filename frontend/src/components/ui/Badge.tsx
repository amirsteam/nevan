/**
 * Badge Component
 * Status badges and tags for various use cases
 */
import { ReactNode } from "react";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";
type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
  removable?: boolean;
  onRemove?: () => void;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
  primary: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]",
  success:
    "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  warning:
    "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

const dotColors: Record<BadgeVariant, string> = {
  default: "bg-gray-500",
  primary: "bg-[var(--color-primary)]",
  success: "bg-green-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-blue-500",
};

const Badge = ({
  children,
  variant = "default",
  size = "md",
  dot = false,
  removable = false,
  onRemove,
  className = "",
}: BadgeProps) => {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 font-medium rounded-full
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-2 h-2 rounded-full ${dotColors[variant]} ${variant === "warning" ? "" : "animate-pulse-slow"}`}
        />
      )}
      {children}
      {removable && onRemove && (
        <button
          onClick={onRemove}
          className="ml-1 p-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
          aria-label="Remove"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
};

// Order Status Badge preset
interface OrderStatusBadgeProps {
  status:
    | "pending"
    | "confirmed"
    | "processing"
    | "shipped"
    | "delivered"
    | "cancelled";
  size?: BadgeSize;
}

export const OrderStatusBadge = ({
  status,
  size = "md",
}: OrderStatusBadgeProps) => {
  const statusConfig: Record<string, { variant: BadgeVariant; label: string }> =
    {
      pending: { variant: "warning", label: "Pending" },
      confirmed: { variant: "info", label: "Confirmed" },
      processing: { variant: "primary", label: "Processing" },
      shipped: { variant: "info", label: "Shipped" },
      delivered: { variant: "success", label: "Delivered" },
      cancelled: { variant: "danger", label: "Cancelled" },
    };

  const config = statusConfig[status] || { variant: "default", label: status };

  return (
    <Badge variant={config.variant} size={size} dot>
      {config.label}
    </Badge>
  );
};

// Payment Status Badge preset
interface PaymentStatusBadgeProps {
  status: "pending" | "paid" | "failed" | "refunded";
  size?: BadgeSize;
}

export const PaymentStatusBadge = ({
  status,
  size = "md",
}: PaymentStatusBadgeProps) => {
  const statusConfig: Record<string, { variant: BadgeVariant; label: string }> =
    {
      pending: { variant: "warning", label: "Payment Pending" },
      paid: { variant: "success", label: "Paid" },
      failed: { variant: "danger", label: "Payment Failed" },
      refunded: { variant: "info", label: "Refunded" },
    };

  const config = statusConfig[status] || { variant: "default", label: status };

  return (
    <Badge variant={config.variant} size={size}>
      {config.label}
    </Badge>
  );
};

// Stock Badge preset
interface StockBadgeProps {
  stock: number;
  size?: BadgeSize;
}

export const StockBadge = ({ stock, size = "sm" }: StockBadgeProps) => {
  if (stock === 0) {
    return (
      <Badge variant="danger" size={size}>
        Out of Stock
      </Badge>
    );
  }
  if (stock <= 5) {
    return (
      <Badge variant="warning" size={size}>
        Low Stock ({stock})
      </Badge>
    );
  }
  return (
    <Badge variant="success" size={size}>
      In Stock ({stock})
    </Badge>
  );
};

export default Badge;
