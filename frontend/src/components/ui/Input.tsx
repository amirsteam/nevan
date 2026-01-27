/**
 * Input Components
 * Form inputs with validation states and floating labels
 */
import {
  forwardRef,
  useState,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";
import { Eye, EyeOff, AlertCircle, CheckCircle } from "lucide-react";

// Base Input Props
interface BaseInputProps {
  label?: string;
  error?: string;
  success?: string;
  hint?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isRequired?: boolean;
}

// Text Input
interface TextInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "size">, BaseInputProps {
  size?: "sm" | "md" | "lg";
}

export const Input = forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      label,
      error,
      success,
      hint,
      leftIcon,
      rightIcon,
      isRequired,
      size = "md",
      className = "",
      type = "text",
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === "password";

    const sizeClasses = {
      sm: "h-9 text-sm",
      md: "h-11",
      lg: "h-12 text-lg",
    };

    const inputClasses = `
    w-full rounded-xl border transition-all duration-200
    ${leftIcon ? "pl-11" : "px-4"}
    ${rightIcon || isPassword ? "pr-11" : "px-4"}
    ${sizeClasses[size]}
    ${
      error
        ? "border-red-500 focus:ring-red-500 focus:border-red-500"
        : success
          ? "border-green-500 focus:ring-green-500 focus:border-green-500"
          : "border-[var(--color-border)] focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
    }
    bg-[var(--color-background)] text-[var(--color-text)]
    placeholder:text-[var(--color-text-muted)]
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:opacity-50 disabled:cursor-not-allowed
    ${className}
  `;

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[var(--color-text)]">
            {label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            type={isPassword && showPassword ? "text" : type}
            className={inputClasses}
            aria-invalid={!!error}
            aria-describedby={
              error
                ? `${props.id}-error`
                : hint
                  ? `${props.id}-hint`
                  : undefined
            }
            {...props}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          )}

          {!isPassword && rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]">
              {rightIcon}
            </div>
          )}

          {error && !rightIcon && !isPassword && (
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
          )}

          {success && !rightIcon && !isPassword && (
            <CheckCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" />
          )}
        </div>

        {error && (
          <p
            id={`${props.id}-error`}
            className="text-sm text-red-500 flex items-center gap-1"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}

        {success && !error && (
          <p className="text-sm text-green-500 flex items-center gap-1">
            <CheckCircle className="w-4 h-4" />
            {success}
          </p>
        )}

        {hint && !error && !success && (
          <p
            id={`${props.id}-hint`}
            className="text-sm text-[var(--color-text-muted)]"
          >
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

// Textarea
interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>, BaseInputProps {
  resize?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      error,
      success,
      hint,
      isRequired,
      resize = true,
      className = "",
      rows = 4,
      ...props
    },
    ref,
  ) => {
    const textareaClasses = `
    w-full rounded-xl border px-4 py-3 transition-all duration-200
    ${
      error
        ? "border-red-500 focus:ring-red-500 focus:border-red-500"
        : success
          ? "border-green-500 focus:ring-green-500 focus:border-green-500"
          : "border-[var(--color-border)] focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
    }
    bg-[var(--color-background)] text-[var(--color-text)]
    placeholder:text-[var(--color-text-muted)]
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:opacity-50 disabled:cursor-not-allowed
    ${!resize ? "resize-none" : ""}
    ${className}
  `;

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[var(--color-text)]">
            {label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <textarea
          ref={ref}
          rows={rows}
          className={textareaClasses}
          aria-invalid={!!error}
          {...props}
        />

        {error && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}

        {hint && !error && (
          <p className="text-sm text-[var(--color-text-muted)]">{hint}</p>
        )}
      </div>
    );
  },
);

Textarea.displayName = "Textarea";

// Select
interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps
  extends
    Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">,
    BaseInputProps {
  options: SelectOption[];
  placeholder?: string;
  size?: "sm" | "md" | "lg";
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      success,
      hint,
      isRequired,
      options,
      placeholder,
      size = "md",
      className = "",
      ...props
    },
    ref,
  ) => {
    const sizeClasses = {
      sm: "h-9 text-sm",
      md: "h-11",
      lg: "h-12 text-lg",
    };

    const selectClasses = `
    w-full rounded-xl border px-4 transition-all duration-200 appearance-none
    ${sizeClasses[size]}
    ${
      error
        ? "border-red-500 focus:ring-red-500 focus:border-red-500"
        : success
          ? "border-green-500 focus:ring-green-500 focus:border-green-500"
          : "border-[var(--color-border)] focus:ring-[var(--color-primary)] focus:border-[var(--color-primary)]"
    }
    bg-[var(--color-background)] text-[var(--color-text)]
    focus:outline-none focus:ring-2 focus:ring-offset-0
    disabled:opacity-50 disabled:cursor-not-allowed
    bg-[url("data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E")]
    bg-no-repeat bg-[right_0.75rem_center] bg-[length:1.25rem_1.25rem]
    pr-10
    ${className}
  `;

    return (
      <div className="space-y-1.5">
        {label && (
          <label className="block text-sm font-medium text-[var(--color-text)]">
            {label}
            {isRequired && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <select
          ref={ref}
          className={selectClasses}
          aria-invalid={!!error}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>

        {error && (
          <p className="text-sm text-red-500 flex items-center gap-1">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
        )}

        {hint && !error && (
          <p className="text-sm text-[var(--color-text-muted)]">{hint}</p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";

// Checkbox
interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label: string;
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = "", ...props }, ref) => {
    return (
      <label className={`flex items-start gap-3 cursor-pointer ${className}`}>
        <input
          ref={ref}
          type="checkbox"
          className="w-5 h-5 rounded border-[var(--color-border)] text-[var(--color-primary)] focus:ring-[var(--color-primary)] cursor-pointer mt-0.5"
          {...props}
        />
        <div>
          <span className="text-sm font-medium text-[var(--color-text)]">
            {label}
          </span>
          {description && (
            <p className="text-sm text-[var(--color-text-muted)]">
              {description}
            </p>
          )}
        </div>
      </label>
    );
  },
);

Checkbox.displayName = "Checkbox";

export default Input;
