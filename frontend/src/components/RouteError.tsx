/**
 * RouteError
 * Router errorElement: a crash in one page (or a failed lazy chunk after a
 * deploy) shows a recoverable screen instead of a blank page.
 */
import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { captureError } from "../utils/monitoring";
import { useEffect } from "react";

const isChunkError = (error: unknown) =>
  error instanceof Error && /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module/i.test(error.message);

const RouteError = () => {
  const error = useRouteError();
  const notFound = isRouteErrorResponse(error) && error.status === 404;
  const chunk = isChunkError(error);

  useEffect(() => {
    if (!notFound) captureError(error, { source: "route" });
  }, [error, notFound]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16 bg-[var(--color-bg)] text-[var(--color-text)]">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-[var(--color-primary-soft)] flex items-center justify-center">
          <AlertTriangle className="w-8 h-8 text-[var(--color-primary)]" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-bold mb-2">
          {notFound ? "Page not found" : chunk ? "A new version is available" : "Something went wrong"}
        </h1>
        <p className="text-[var(--color-text-muted)] mb-6">
          {notFound
            ? "The page you're looking for doesn't exist."
            : chunk
              ? "We've updated the shop since you opened it. Reload to continue."
              : "Sorry — this page hit a problem. Reloading usually fixes it; your cart is saved."}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button type="button" onClick={() => window.location.reload()} className="btn btn-primary">
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            Reload
          </button>
          <Link to="/" reloadDocument className="btn btn-secondary">
            Go to home page
          </Link>
        </div>
      </div>
    </div>
  );
};

export default RouteError;
