/**
 * "Recently viewed" rail: products this browser looked at, newest first,
 * fetched fresh by id so prices, sales and stock are current. Hidden when
 * there's nothing to show; "Clear" forgets the list (shared family phones).
 */
import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { productsAPI } from "../api";
import { useRecentlyViewed } from "../hooks/useRecentlyViewed";
import { clearRecentlyViewed } from "../utils/recentlyViewed";
import ProductRail from "./home/ProductRail";
import type { IProduct } from "../types";

interface RecentlyViewedProps {
  /** The product on screen: left out of its own page's list */
  excludeId?: string;
  className?: string;
  contained?: boolean;
  compact?: boolean;
  reveal?: boolean;
}

const RecentlyViewed = ({ excludeId, ...railLayout }: RecentlyViewedProps) => {
  const ids = useRecentlyViewed();
  const wanted = ids.filter((id) => id !== excludeId);
  // Products fetched so far; null = no longer available (hidden or deleted)
  const [byId, setById] = useState<Record<string, IProduct | null>>({});
  // Only ids not fetched yet, so moving between product pages doesn't refetch the rest
  const missing = wanted.filter((id) => !(id in byId));
  const missingKey = missing.join(",");

  useEffect(() => {
    if (!missingKey) return;
    let cancelled = false;
    const requested = missingKey.split(",");
    const settle = (found: IProduct[]) => {
      if (cancelled) return;
      const map = new Map(found.map((product) => [product._id, product]));
      setById((prev) => ({ ...prev, ...Object.fromEntries(requested.map((id) => [id, map.get(id) ?? null])) }));
    };
    productsAPI
      .getProducts({ ids: missingKey, limit: requested.length })
      .then((res) => settle(res.data.products || []))
      // Offline or failing: leave them out for now rather than retry in a loop
      .catch(() => settle([]));
    return () => {
      cancelled = true;
    };
  }, [missingKey]);

  // In viewing order (the API returns its own sort)
  const products = wanted.map((id) => byId[id]).filter((product): product is IProduct => !!product);
  const loading = products.length === 0 && missing.length > 0;
  if (!loading && products.length === 0) return null;

  return (
    <ProductRail
      id="recently-viewed-title"
      title="Recently viewed"
      subtitle="Pick up where you left off"
      icon={<History className="w-5 h-5 text-[var(--color-primary)]" aria-hidden="true" />}
      products={products}
      loading={loading}
      skeletonCount={Math.min(missing.length, 5)}
      extraControls={
        <button
          type="button"
          onClick={clearRecentlyViewed}
          aria-label="Clear recently viewed"
          className="text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-primary)] hover:underline underline-offset-4"
        >
          Clear
        </button>
      }
      {...railLayout}
    />
  );
};

export default RecentlyViewed;
