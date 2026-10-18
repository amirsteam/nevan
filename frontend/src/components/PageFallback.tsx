/**
 * Shown while a lazily loaded page's code downloads. It fills at least a
 * screen's height so the footer stays below the fold: otherwise the footer is
 * drawn near the top and then pushed down when the page arrives (a large
 * layout shift on every lazy page).
 */
import { Loader2 } from "lucide-react";

const PageFallback = () => (
  <div className="flex justify-center pt-24 min-h-[100svh]" role="status" aria-live="polite">
    <Loader2 className="w-7 h-7 animate-spin text-[var(--color-primary)]" aria-hidden="true" />
    <span className="sr-only">Loading…</span>
  </div>
);

export default PageFallback;
