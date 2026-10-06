/**
 * Error monitoring (Sentry). Inactive unless VITE_SENTRY_DSN is set at build time;
 * the SDK is loaded as a separate chunk only in that case.
 */
type SentryModule = typeof import("@sentry/react");

let sentry: SentryModule | null = null;

export const initMonitoring = async (): Promise<void> => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  sentry = await import("@sentry/react");
  sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    // Errors only; no performance tracing or session replay
    tracesSampleRate: 0,
  });
};

export const captureError = (error: unknown, context?: Record<string, unknown>): void => {
  sentry?.captureException(error, context ? { extra: context } : undefined);
};
