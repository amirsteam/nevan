/**
 * Modal Component
 * Accessible dialog: focus moves in and is trapped while open, Escape and the
 * backdrop close it, and focus returns to the opener afterwards.
 * `variant="sheet"` slides up from the bottom on phones (filters, menus) and
 * is a centered dialog from `sm` up.
 */
import { useEffect, useId, useRef, ReactNode } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  /** Accessible name when there's no visible title */
  ariaLabel?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  variant?: "dialog" | "sheet";
  showCloseButton?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  bodyClassName?: string;
}

const sizeClasses = {
  sm: "sm:max-w-sm",
  md: "sm:max-w-md",
  lg: "sm:max-w-lg",
  xl: "sm:max-w-xl",
  full: "sm:max-w-4xl",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

const Modal = ({
  isOpen,
  onClose,
  title,
  ariaLabel,
  description,
  children,
  footer,
  size = "md",
  variant = "dialog",
  showCloseButton = true,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = "",
  bodyClassName = "",
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  const titleId = useId();
  const descriptionId = useId();

  // Focus, scroll lock and keyboard handling while open
  useEffect(() => {
    if (!isOpen) return;

    previousFocusRef.current = document.activeElement as HTMLElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // First focusable control (skipping the close button when there's a better target)
    const node = modalRef.current;
    const focusables = node ? Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    const first = focusables.find((el) => !el.dataset.modalClose) || focusables[0];
    (first || node)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && closeOnEscape) {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !modalRef.current) return;

      const items = Array.from(modalRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const firstItem = items[0];
      const lastItem = items[items.length - 1];
      if (e.shiftKey && document.activeElement === firstItem) {
        e.preventDefault();
        lastItem.focus();
      } else if (!e.shiftKey && document.activeElement === lastItem) {
        e.preventDefault();
        firstItem.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocusRef.current?.focus?.();
    };
  }, [isOpen, closeOnEscape]);

  if (!isOpen) return null;

  const isSheet = variant === "sheet";

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex justify-center ${
        isSheet ? "items-end sm:items-center sm:p-4" : "items-center p-4"
      }`}
      onMouseDown={(e) => {
        if (closeOnOverlayClick && e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[var(--color-overlay)] backdrop-blur-[2px] animate-fadeIn pointer-events-none"
      />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={!title ? ariaLabel : undefined}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={`relative w-full ${sizeClasses[size]} flex flex-col bg-[var(--color-surface)] text-[var(--color-text)] shadow-[var(--shadow-lg)] outline-none ${
          isSheet
            ? "max-h-[88vh] rounded-t-2xl sm:rounded-xl animate-slideUp pb-[env(safe-area-inset-bottom)]"
            : "max-h-[calc(100vh-2rem)] rounded-xl animate-slideUp"
        } ${className}`}
      >
        {isSheet && (
          <div aria-hidden="true" className="sm:hidden mx-auto mt-2 h-1.5 w-10 rounded-full bg-[var(--color-border-strong)]" />
        )}

        {(title || showCloseButton) && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--color-border)]">
            {title && (
              <h2 id={titleId} className="text-lg font-semibold">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                type="button"
                data-modal-close="true"
                onClick={onClose}
                className="p-2 -mr-2 rounded-lg hover:bg-[var(--color-surface-muted)] transition-colors ml-auto"
                aria-label="Close"
              >
                <X className="w-5 h-5 text-[var(--color-text-muted)]" aria-hidden="true" />
              </button>
            )}
          </div>
        )}

        {description && (
          <p id={descriptionId} className="sr-only">
            {description}
          </p>
        )}

        <div className={`p-4 overflow-y-auto overscroll-contain flex-1 ${bodyClassName}`}>{children}</div>

        {footer && (
          <div className="px-4 py-3 border-t border-[var(--color-border)] flex gap-3 justify-end">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
};

// Confirmation Modal Helper
interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  isLoading?: boolean;
}

export const ConfirmModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) => {
  const variantClasses = {
    danger: "bg-red-700 hover:bg-red-800 text-white",
    warning: "bg-amber-700 hover:bg-amber-800 text-white",
    info: "bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-[var(--color-on-primary)]",
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={isLoading ? () => {} : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <button type="button" onClick={onClose} disabled={isLoading} className="btn btn-secondary">
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            aria-busy={isLoading}
            className={`btn ${variantClasses[variant]}`}
          >
            {isLoading ? "Working…" : confirmText}
          </button>
        </>
      }
    >
      <div className="text-[var(--color-text-muted)]">{message}</div>
    </Modal>
  );
};

export default Modal;
