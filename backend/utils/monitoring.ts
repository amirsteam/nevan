/**
 * Error monitoring (Sentry). Inactive unless SENTRY_DSN is set.
 */
import * as Sentry from "@sentry/node";

let enabled = false;

export const initMonitoring = (): void => {
  if (!process.env.SENTRY_DSN || process.env.NODE_ENV === "test") return;

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    // Errors only; no performance tracing
    tracesSampleRate: 0,
  });
  enabled = true;
};

export const captureError = (error: unknown, context?: Record<string, unknown>): void => {
  if (!enabled) return;
  Sentry.captureException(error, context ? { extra: context } : undefined);
};

/** Wait for queued events to be sent (use before process.exit) */
export const flushMonitoring = async (timeoutMs = 2000): Promise<void> => {
  if (!enabled) return;
  await Sentry.flush(timeoutMs);
};
