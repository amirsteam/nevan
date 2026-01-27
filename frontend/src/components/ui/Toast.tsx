/**
 * Toast Configuration
 * Enhanced toast notifications with custom styling
 */
import toast, { Toaster as HotToaster } from "react-hot-toast";
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Loader2,
} from "lucide-react";

// Custom toast styles
export const toastConfig = {
  duration: 4000,
  position: "top-right" as const,
  style: {
    background: "var(--color-surface)",
    color: "var(--color-text)",
    border: "1px solid var(--color-border)",
    borderRadius: "12px",
    padding: "16px",
    boxShadow: "0 10px 40px rgba(0,0,0,0.1)",
    maxWidth: "400px",
  },
};

// Custom Toaster component with enhanced styling
export const Toaster = () => (
  <HotToaster
    position="top-right"
    gutter={12}
    containerStyle={{
      top: 80,
      right: 20,
    }}
    toastOptions={{
      duration: 4000,
      style: toastConfig.style,
      success: {
        iconTheme: {
          primary: "var(--color-success)",
          secondary: "white",
        },
      },
      error: {
        iconTheme: {
          primary: "var(--color-error)",
          secondary: "white",
        },
      },
    }}
  />
);

// Enhanced toast functions
export const showToast = {
  success: (message: string, options?: object) => {
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-slideIn" : "animate-slideOut"
          } max-w-md w-full bg-[var(--color-surface)] shadow-lg rounded-xl pointer-events-auto flex items-center gap-3 p-4 border border-green-200 dark:border-green-900`}
        >
          <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text)]">
              Success
            </p>
            <p className="text-sm text-[var(--color-text-muted)] truncate">
              {message}
            </p>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      ),
      { duration: 4000, ...options },
    );
  },

  error: (message: string, options?: object) => {
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-slideIn" : "animate-slideOut"
          } max-w-md w-full bg-[var(--color-surface)] shadow-lg rounded-xl pointer-events-auto flex items-center gap-3 p-4 border border-red-200 dark:border-red-900`}
        >
          <div className="flex-shrink-0 w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text)]">
              Error
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">{message}</p>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      ),
      { duration: 5000, ...options },
    );
  },

  warning: (message: string, options?: object) => {
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-slideIn" : "animate-slideOut"
          } max-w-md w-full bg-[var(--color-surface)] shadow-lg rounded-xl pointer-events-auto flex items-center gap-3 p-4 border border-yellow-200 dark:border-yellow-900`}
        >
          <div className="flex-shrink-0 w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text)]">
              Warning
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">{message}</p>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      ),
      { duration: 4000, ...options },
    );
  },

  info: (message: string, options?: object) => {
    toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-slideIn" : "animate-slideOut"
          } max-w-md w-full bg-[var(--color-surface)] shadow-lg rounded-xl pointer-events-auto flex items-center gap-3 p-4 border border-blue-200 dark:border-blue-900`}
        >
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text)]">Info</p>
            <p className="text-sm text-[var(--color-text-muted)]">{message}</p>
          </div>
          <button
            onClick={() => toast.dismiss(t.id)}
            className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            <XCircle className="w-5 h-5" />
          </button>
        </div>
      ),
      { duration: 4000, ...options },
    );
  },

  loading: (message: string) => {
    return toast.custom(
      (t) => (
        <div
          className={`${
            t.visible ? "animate-slideIn" : "animate-slideOut"
          } max-w-md w-full bg-[var(--color-surface)] shadow-lg rounded-xl pointer-events-auto flex items-center gap-3 p-4 border border-[var(--color-border)]`}
        >
          <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-primary)]/10 rounded-full flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-[var(--color-primary)] animate-spin" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-[var(--color-text)]">
              Loading
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">{message}</p>
          </div>
        </div>
      ),
      { duration: Infinity },
    );
  },

  dismiss: (toastId?: string) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },

  // Promise toast for async operations
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string;
      error: string;
    },
  ) => {
    return toast.promise(promise, messages, {
      style: toastConfig.style,
    });
  },
};

export default showToast;
