/**
 * Horizontally scrolling row of product cards (home "New arrivals").
 * Touch and trackpad users swipe; on desktop the header gets previous/next
 * buttons that page by the visible width and disable at either end.
 */
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ProductCard from "../ProductCard";
import { LoadingRegion, ProductCardSkeleton } from "../ui/Skeleton";
import SectionHeader from "./SectionHeader";
import type { IProduct } from "../../types";

// Two cards plus a peek on phones (hints that it scrolls), up to five on desktop
const RAIL_CLASSES =
  "grid grid-flow-col auto-cols-[44%] sm:auto-cols-[calc((100%_-_2rem)/3)] md:auto-cols-[calc((100%_-_4.5rem)/4)] lg:auto-cols-[calc((100%_-_6rem)/5)] gap-4 md:gap-6";
// Full-bleed on phones so cards scroll out from under the screen edge
const BLEED_CLASSES = "-mx-4 px-4 scroll-px-4 sm:-mx-5 sm:px-5 sm:scroll-px-5 md:mx-0 md:px-0 md:scroll-px-0";

const prefersReducedMotion = (): boolean =>
  typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

interface ProductRailProps {
  id: string;
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  action?: { to: string; label: string };
  products: IProduct[];
  loading?: boolean;
  /** Placeholder cards while loading */
  skeletonCount?: number;
  /** Section spacing/background */
  className?: string;
  /** false inside a page that already has a container-app */
  contained?: boolean;
  /** Smaller heading, for use within a page */
  compact?: boolean;
  /** Scroll-in fade; off for rails near the fold */
  reveal?: boolean;
  /** Extra header controls before the arrows (e.g. "Clear") */
  extraControls?: ReactNode;
}

const ProductRail = ({
  id,
  title,
  subtitle,
  icon,
  action,
  products,
  loading = false,
  skeletonCount = 5,
  className = "py-12 md:py-16",
  contained = true,
  compact = false,
  reveal = true,
  extraControls,
}: ProductRailProps) => {
  const railRef = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  const updateEdges = useCallback(() => {
    const rail = railRef.current;
    if (!rail) return;
    // A pixel of slack: scroll positions can be fractional
    setEdges({
      atStart: rail.scrollLeft <= 1,
      atEnd: rail.scrollLeft + rail.clientWidth >= rail.scrollWidth - 1,
    });
  }, []);

  useEffect(() => {
    const rail = railRef.current;
    if (!rail || typeof ResizeObserver === "undefined") return;
    // Reports once on observe, then whenever the rail changes size
    const observer = new ResizeObserver(updateEdges);
    observer.observe(rail);
    return () => observer.disconnect();
  }, [updateEdges, products.length, loading]);

  const page = (direction: 1 | -1) => {
    const rail = railRef.current;
    if (!rail) return;
    rail.scrollBy?.({ left: direction * rail.clientWidth * 0.9, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  if (!loading && products.length === 0) return null;
  const scrollable = !edges.atStart || !edges.atEnd;

  const arrowClass =
    "w-10 h-10 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-center transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:opacity-40 disabled:pointer-events-none";

  return (
    <section aria-labelledby={id} className={className}>
      <div className={`${contained ? "container-app" : ""} ${reveal ? "reveal" : ""}`}>
        <SectionHeader
          id={id}
          title={title}
          subtitle={subtitle}
          icon={icon}
          action={action}
          compact={compact}
          controls={
            (extraControls || (!loading && scrollable)) && (
              <>
                {extraControls}
                {!loading && scrollable && (
                  <div className="hidden md:flex gap-2">
                    <button type="button" onClick={() => page(-1)} disabled={edges.atStart} aria-label="Scroll back" className={arrowClass}>
                      <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                    </button>
                    <button type="button" onClick={() => page(1)} disabled={edges.atEnd} aria-label="Scroll forward" className={arrowClass}>
                      <ChevronRight className="w-5 h-5" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </>
            )
          }
        />
        {loading ? (
          <LoadingRegion label="Loading products" className={`${RAIL_CLASSES} overflow-hidden ${BLEED_CLASSES}`}>
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </LoadingRegion>
        ) : (
          <ul
            ref={railRef}
            onScroll={updateEdges}
            // Vertical padding keeps card hover shadows from being clipped
            className={`${RAIL_CLASSES} ${BLEED_CLASSES} overflow-x-auto overscroll-x-contain snap-x snap-mandatory scrollbar-none -my-3 py-3`}
          >
            {products.map((product) => (
              <li key={product._id} className="snap-start flex">
                <ProductCard product={product} className="w-full" />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default ProductRail;
