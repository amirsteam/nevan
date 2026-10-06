/**
 * Skeleton Loading Components
 * Provides loading placeholder animations for better UX
 */
import { CSSProperties } from "react";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

// Uses the .skeleton shimmer from index.css (theme tokens, so it works in dark mode)
export const Skeleton = ({ className = "", style }: SkeletonProps) => (
  <div aria-hidden="true" className={`skeleton rounded ${className}`} style={style} />
);

/** Wraps placeholder content so screen readers hear one "Loading" instead of nothing */
export const LoadingRegion = ({
  label = "Loading",
  children,
  className = "",
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) => (
  <div role="status" aria-live="polite" aria-busy="true" className={className}>
    <span className="sr-only">{label}…</span>
    {children}
  </div>
);

export const ProductCardSkeleton = () => (
  <div className="card" aria-hidden="true">
    <Skeleton className="aspect-[4/5] w-full rounded-none" />
    <div className="p-4 space-y-3">
      <Skeleton className="h-3 w-16" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-5 w-3/4" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
      </div>
    </div>
  </div>
);

export const ProductGridSkeleton = ({
  count = 8,
  className = "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6",
}: {
  count?: number;
  className?: string;
}) => (
  <LoadingRegion label="Loading products" className={className}>
    {Array.from({ length: count }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </LoadingRegion>
);

export const ProductDetailSkeleton = () => (
  <LoadingRegion label="Loading product" className="container-app py-8">
    <Skeleton className="h-4 w-48 mb-6" />
    <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
      <div className="space-y-3">
        <Skeleton className="aspect-square w-full rounded-xl" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="w-20 h-20 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
  </LoadingRegion>
);

export const CategoryCardSkeleton = () => (
  <div className="relative aspect-4/3 rounded-xl overflow-hidden" aria-hidden="true">
    <Skeleton className="w-full h-full" />
  </div>
);

export const OrderItemSkeleton = () => (
  <div className="card p-4 flex gap-4">
    <Skeleton className="w-20 h-20 rounded-lg shrink-0" />
    <div className="flex-1 space-y-2">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-24" />
    </div>
    <Skeleton className="h-8 w-24" />
  </div>
);

export const TableRowSkeleton = ({ columns = 5 }: { columns?: number }) => (
  <tr className="border-b border-(--color-border)">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="p-4">
        <Skeleton className="h-5 w-full max-w-30" />
      </td>
    ))}
  </tr>
);

export const DashboardStatSkeleton = () => (
  <div className="card p-4">
    <div className="flex justify-between items-start">
      <div className="space-y-2">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="w-12 h-12 rounded-lg" />
    </div>
  </div>
);

// Fixed bar heights so the placeholder doesn't jump around on re-render
const CHART_SKELETON_HEIGHTS = [45, 70, 35, 80, 55, 65, 40];

export const ChartSkeleton = () => (
  <div className="card p-4">
    <Skeleton className="h-6 w-48 mb-4" />
    <div className="h-72 flex items-end justify-around gap-2">
      {CHART_SKELETON_HEIGHTS.map((height, i) => (
        <Skeleton key={i} className="w-full" style={{ height: `${height}%` }} />
      ))}
    </div>
  </div>
);

export default Skeleton;
