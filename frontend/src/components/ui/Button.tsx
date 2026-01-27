/**
 * Button Component
 * Versatile button with multiple variants and states
 */
import { forwardRef, ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger"
  | "success";
type ButtonSize = "sm" | "md" | "lg" | "xl";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary: `
    bg-[var(--color-primary)] text-white
    hover:bg-[var(--color-primary-dark)] 
    focus:ring-[var(--color-primary)]
    shadow-sm hover:shadow-md
  `,
  secondary: `
    bg-[var(--color-surface)] text-[var(--color-text)]
    border border-[var(--color-border)]
    hover:bg-[var(--color-background)] hover:border-[var(--color-primary)]
    focus:ring-[var(--color-primary)]
  `,
  outline: `
    bg-transparent text-[var(--color-primary)]
    border-2 border-[var(--color-primary)]
    hover:bg-[var(--color-primary)] hover:text-white
    focus:ring-[var(--color-primary)]
  `,
  ghost: `
    bg-transparent text-[var(--color-text)]
    hover:bg-[var(--color-background)]
    focus:ring-[var(--color-primary)]
  `,
  danger: `
    bg-red-600 text-white
    hover:bg-red-700
    focus:ring-red-500
    shadow-sm hover:shadow-md
  `,
  success: `
    bg-green-600 text-white
    hover:bg-green-700
    focus:ring-green-500
    shadow-sm hover:shadow-md
  `,
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-sm gap-1.5 rounded-lg",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-12 px-6 text-base gap-2 rounded-xl",
  xl: "h-14 px-8 text-lg gap-3 rounded-xl",
};

const iconSizes: Record<ButtonSize, string> = {
  sm: "w-4 h-4",
  md: "w-4 h-4",
  lg: "w-5 h-5",
  xl: "w-6 h-6",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      disabled,
      children,
      className = "",
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
        inline-flex items-center justify-center font-medium
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className={`animate-spin ${iconSizes[size]}`} />
            {loadingText && <span>{loadingText}</span>}
          </>
        ) : (
          <>
            {leftIcon && <span className={iconSizes[size]}>{leftIcon}</span>}
            {children}
            {rightIcon && <span className={iconSizes[size]}>{rightIcon}</span>}
          </>
        )}
      </button>
    );
  },
);

Button.displayName = "Button";

// Icon Button variant
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  "aria-label": string;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      icon,
      variant = "ghost",
      size = "md",
      isLoading = false,
      className = "",
      ...props
    },
    ref,
  ) => {
    const iconButtonSizes: Record<ButtonSize, string> = {
      sm: "w-8 h-8",
      md: "w-10 h-10",
      lg: "w-12 h-12",
      xl: "w-14 h-14",
    };

    return (
      <button
        ref={ref}
        disabled={isLoading || props.disabled}
        className={`
        inline-flex items-center justify-center rounded-lg
        transition-all duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantClasses[variant]}
        ${iconButtonSizes[size]}
        ${className}
      `}
        {...props}
      >
        {isLoading ? (
          <Loader2 className={`animate-spin ${iconSizes[size]}`} />
        ) : (
          <span className={iconSizes[size]}>{icon}</span>
        )}
      </button>
    );
  },
);

IconButton.displayName = "IconButton";

// Button Group
interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
  attached?: boolean;
}

export const ButtonGroup = ({
  children,
  className = "",
  attached = false,
}: ButtonGroupProps) => {
  return (
    <div
      className={`
        flex
        ${
          attached
            ? "[&>button]:rounded-none [&>button:first-child]:rounded-l-lg [&>button:last-child]:rounded-r-lg [&>button:not(:last-child)]:border-r-0"
            : "gap-2"
        }
        ${className}
      `}
      role="group"
    >
      {children}
    </div>
  );
};

export default Button;
