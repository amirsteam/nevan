/**
 * Price Display Component
 * Formatted price display with discount highlighting
 */
import { formatPrice } from "../../utils/helpers";

interface PriceDisplayProps {
  price: number;
  comparePrice?: number;
  size?: "sm" | "md" | "lg" | "xl";
  showSavings?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: {
    price: "text-sm font-semibold",
    compare: "text-xs",
    savings: "text-xs",
  },
  md: {
    price: "text-lg font-bold",
    compare: "text-sm",
    savings: "text-xs",
  },
  lg: {
    price: "text-2xl font-bold",
    compare: "text-base",
    savings: "text-sm",
  },
  xl: {
    price: "text-3xl font-bold",
    compare: "text-lg",
    savings: "text-sm",
  },
};

const PriceDisplay = ({
  price,
  comparePrice,
  size = "md",
  showSavings = false,
  className = "",
}: PriceDisplayProps) => {
  const hasDiscount = comparePrice && comparePrice > price;
  const savingsAmount = hasDiscount ? comparePrice - price : 0;
  const savingsPercent = hasDiscount
    ? Math.round(((comparePrice - price) / comparePrice) * 100)
    : 0;

  const classes = sizeClasses[size];

  return (
    <div className={`flex flex-wrap items-baseline gap-2 ${className}`}>
      {/* Current Price */}
      <span className={`text-[var(--color-primary)] ${classes.price}`}>
        {formatPrice(price)}
      </span>

      {/* Compare Price (strikethrough) */}
      {hasDiscount && (
        <span
          className={`text-[var(--color-text-muted)] line-through ${classes.compare}`}
        >
          {formatPrice(comparePrice)}
        </span>
      )}

      {/* Savings Badge */}
      {hasDiscount && showSavings && (
        <span
          className={`px-2 py-0.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full font-medium ${classes.savings}`}
        >
          Save {formatPrice(savingsAmount)} ({savingsPercent}%)
        </span>
      )}
    </div>
  );
};

// Compact Price Tag (for listing items)
interface PriceTagProps {
  price: number;
  comparePrice?: number;
  className?: string;
}

export const PriceTag = ({
  price,
  comparePrice,
  className = "",
}: PriceTagProps) => {
  const hasDiscount = comparePrice && comparePrice > price;

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <span className="font-bold text-[var(--color-primary)]">
        {formatPrice(price)}
      </span>
      {hasDiscount && (
        <span className="text-sm text-[var(--color-text-muted)] line-through">
          {formatPrice(comparePrice)}
        </span>
      )}
    </div>
  );
};

// Discount Badge
interface DiscountBadgeProps {
  comparePrice: number;
  price: number;
  className?: string;
}

export const DiscountBadge = ({
  comparePrice,
  price,
  className = "",
}: DiscountBadgeProps) => {
  if (comparePrice <= price) return null;

  const percent = Math.round(((comparePrice - price) / comparePrice) * 100);

  return (
    <span
      className={`px-2.5 py-1 bg-red-500 text-white text-xs font-bold rounded-full shadow-lg ${className}`}
    >
      -{percent}%
    </span>
  );
};

export default PriceDisplay;
