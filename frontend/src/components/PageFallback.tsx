/**
 * Shown while a lazily loaded page's code downloads
 */
import { Loader2 } from "lucide-react";

const PageFallback = () => (
  <div className="flex items-center justify-center py-24" role="status" aria-live="polite">
    <Loader2 className="w-7 h-7 animate-spin text-[var(--color-primary)]" aria-hidden="true" />
    <span className="sr-only">Loading…</span>
  </div>
);

export default PageFallback;
