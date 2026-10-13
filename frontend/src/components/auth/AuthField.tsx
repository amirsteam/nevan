/**
 * Labelled input for the sign-in and sign-up forms. The error and hint are tied
 * to the input (aria-invalid / aria-describedby), password fields get a
 * show/hide button and a Caps Lock warning.
 */
import {
  forwardRef,
  useState,
  type FocusEvent,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { AlertCircle, Eye, EyeOff, type LucideIcon } from "lucide-react";

interface AuthFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  icon: LucideIcon;
  error?: string;
  /** Shown under the field (and read with it), e.g. password rules */
  hint?: ReactNode;
  /** Shown at the end of the label row, e.g. a "Forgot password?" link */
  labelAction?: ReactNode;
}

const AuthField = forwardRef<HTMLInputElement, AuthFieldProps>(
  (
    { id, label, icon: Icon, error, hint, labelAction, type = "text", onKeyUp, onBlur, ...props },
    ref,
  ) => {
    const isPassword = type === "password";
    const [visible, setVisible] = useState(false);
    const [capsLock, setCapsLock] = useState(false);

    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    const capsId = `${id}-caps`;
    const describedBy =
      [error && errorId, capsLock && capsId, hint && hintId].filter(Boolean).join(" ") || undefined;

    const handleKeyUp = (e: KeyboardEvent<HTMLInputElement>) => {
      if (isPassword) setCapsLock(e.getModifierState("CapsLock"));
      onKeyUp?.(e);
    };

    const handleBlur = (e: FocusEvent<HTMLInputElement>) => {
      setCapsLock(false);
      onBlur?.(e);
    };

    return (
      <div>
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <label htmlFor={id} className="text-sm font-medium">
            {label}
          </label>
          {labelAction}
        </div>

        <div className="input-group">
          <Icon
            className={`input-icon w-4 h-4 ${error ? "text-[var(--color-error)]" : ""}`}
            aria-hidden="true"
          />
          <input
            ref={ref}
            id={id}
            type={isPassword && visible ? "text" : type}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`input ${isPassword ? "has-icon-right" : ""}`}
            onKeyUp={handleKeyUp}
            onBlur={handleBlur}
            {...props}
          />
          {isPassword && (
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              aria-label="Show password"
              aria-pressed={visible}
              aria-controls={id}
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 inline-flex items-center justify-center w-10 h-10 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors"
            >
              {visible ? (
                <EyeOff className="w-4 h-4" aria-hidden="true" />
              ) : (
                <Eye className="w-4 h-4" aria-hidden="true" />
              )}
            </button>
          )}
        </div>

        {capsLock && (
          <p id={capsId} className="mt-1 text-xs font-medium text-[var(--color-warning)]">
            Caps Lock is on
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1 flex items-start gap-1 text-xs text-[var(--color-error)]">
            <AlertCircle className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
            {error}
          </p>
        )}
        {hint && <div id={hintId}>{hint}</div>}
      </div>
    );
  },
);

AuthField.displayName = "AuthField";

export default AuthField;
