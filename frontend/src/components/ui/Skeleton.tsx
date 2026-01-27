/**
 * Skeleton Loading Components
 * Provides loading placeholder animations for better UX
 */
import { CSSProperties } from "react";

interface SkeletonProps {
  className?: string;
  style?: CSSProperties;
}

export const Skeleton = ({ className = "", style }: SkeletonProps) => (
  <div
    className={`animate-pulse bg-linear-to-r from-gray-200 via-gray-300 to-gray-200 dark:from-gray-700 dark:via-gray-600 dark:to-gray-700 bg-size-[200%_100%] rounded ${className}`}
    style={{ animation: "shimmer 1.5s infinite", ...style }}
  />
);

export const ProductCardSkeleton = () => (
  <div className="card">
    <Skeleton className="aspect-square w-full" />
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

export const ProductGridSkeleton = ({ count = 8 }: { count?: number }) => (
  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
    {Array.from({ length: count }).map((_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </div>
);

export const CategoryCardSkeleton = () => (
  <div className="relative aspect-4/3 rounded-xl overflow-hidden">
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

export const ChartSkeleton = () => (
  <div className="card p-4">
    <Skeleton className="h-6 w-48 mb-4" />
    <div className="h-72 flex items-end justify-around gap-2">
      {Array.from({ length: 7 }).map((_, i) => (
        <Skeleton
          key={i}
          className="w-full"
          style={{ height: `${Math.random() * 60 + 20}%` }}
        />
      ))}
    </div>
  </div>
);

// Add shimmer animation to global styles
const shimmerKeyframes = `
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
`;

// Inject keyframes if not already present
if (typeof document !== "undefined") {
  const styleId = "skeleton-shimmer-styles";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = shimmerKeyframes;
    document.head.appendChild(style);
  }
}

export default Skeleton;
