/**
 * QuantitySelector Component
 * Input for selecting product quantities with +/- buttons
 */
import { Minus, Plus } from "lucide-react";

interface QuantitySelectorProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeClasses = {
  sm: {
    container: "h-8",
    button: "w-8 text-sm",
    input: "w-10 text-sm",
    icon: "w-3.5 h-3.5",
  },
  md: {
    container: "h-10",
    button: "w-10",
    input: "w-14",
    icon: "w-4 h-4",
  },
  lg: {
    container: "h-12",
    button: "w-12 text-lg",
    input: "w-16 text-lg",
    icon: "w-5 h-5",
  },
};

const QuantitySelector = ({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  size = "md",
  className = "",
}: QuantitySelectorProps) => {
  const handleDecrement = () => {
    if (value > min && !disabled) {
      onChange(value - 1);
    }
  };

  const handleIncrement = () => {
    if (value < max && !disabled) {
      onChange(value + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value, 10);
    if (!isNaN(newValue)) {
      const clampedValue = Math.min(Math.max(newValue, min), max);
      onChange(clampedValue);
    }
  };

  const handleBlur = () => {
    // Ensure valid value on blur
    if (value < min) onChange(min);
    if (value > max) onChange(max);
  };

  const classes = sizeClasses[size];

  return (
    <div
      className={`
        inline-flex items-center rounded-lg border border-[var(--color-border)]
        overflow-hidden bg-[var(--color-surface)]
        ${disabled ? "opacity-50 cursor-not-allowed" : ""}
        ${className}
      `}
    >
      {/* Decrement Button */}
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || value <= min}
        className={`
          ${classes.container} ${classes.button}
          flex items-center justify-center
          hover:bg-[var(--color-background)] 
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors border-r border-[var(--color-border)]
        `}
        aria-label="Decrease quantity"
      >
        <Minus className={classes.icon} />
      </button>

      {/* Quantity Input */}
      <input
        type="number"
        value={value}
        onChange={handleInputChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        disabled={disabled}
        className={`
          ${classes.container} ${classes.input}
          text-center font-medium bg-transparent
          focus:outline-none focus:ring-0
          [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
        `}
        aria-label="Quantity"
      />

      {/* Increment Button */}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || value >= max}
        className={`
          ${classes.container} ${classes.button}
          flex items-center justify-center
          hover:bg-[var(--color-background)]
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-colors border-l border-[var(--color-border)]
        `}
        aria-label="Increase quantity"
      >
        <Plus className={classes.icon} />
      </button>
    </div>
  );
};

export default QuantitySelector;
