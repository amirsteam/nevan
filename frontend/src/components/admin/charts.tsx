/**
 * Small pieces shared by the admin Dashboard and Visitors pages: the change
 * against the period before, a product thumbnail and a chart tooltip.
 */
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { imageUrl, imageSrcSet } from "../../utils/image";

/** "+12%" / "−5%" / "New" against the previous period */
export const Change = ({
  current,
  previous,
  emptyLabel = "No data yet",
}: {
  current: number;
  previous: number;
  /** Shown when both periods are zero */
  emptyLabel?: string;
}) => {
  if (previous === 0 && current === 0) return <span className="text-[var(--color-text-muted)]">{emptyLabel}</span>;
  if (previous === 0) return <span className="text-[var(--color-success)]">New</span>;
  const pct = Math.round(((current - previous) / previous) * 100);
  const Icon = pct > 0 ? TrendingUp : pct < 0 ? TrendingDown : Minus;
  const tone = pct > 0 ? "text-[var(--color-success)]" : pct < 0 ? "text-[var(--color-error)]" : "text-[var(--color-text-muted)]";
  return (
    <span className={`inline-flex items-center gap-1 ${tone}`}>
      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
      {pct > 0 ? "+" : pct < 0 ? "−" : ""}
      {Math.abs(pct)}%
    </span>
  );
};

/** Small product photo (Cloudinary resizes it) */
export const Thumb = ({ url, size = 40 }: { url?: string; size?: number }) =>
  url ? (
    <img
      src={imageUrl(url, size)}
      srcSet={imageSrcSet(url, size)}
      alt=""
      width={size}
      height={size}
      loading="lazy"
      className="rounded-lg object-cover shrink-0"
      style={{ width: size, height: size }}
    />
  ) : (
    <span className="rounded-lg bg-[var(--color-surface-muted)] shrink-0" style={{ width: size, height: size }} />
  );

interface SeriesTooltipProps {
  active?: boolean;
  payload?: { name?: string; value?: number | string; color?: string }[];
  label?: string | number;
  /** Turns the x value into a heading ("Mon 14 Oct", "10am") */
  labelFormatter?: (label: string | number) => string;
}

/** Tooltip listing every series at one point, in the app's colours */
export const SeriesTooltip = ({ active, payload, label, labelFormatter }: SeriesTooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3 shadow-lg text-sm">
      {label !== undefined && <p className="font-medium mb-1">{labelFormatter ? labelFormatter(label) : label}</p>}
      {payload.map((item) => (
        <p key={item.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} aria-hidden="true" />
          <span className="text-[var(--color-text-muted)]">{item.name}:</span>
          <span className="font-medium">{item.value}</span>
        </p>
      ))}
    </div>
  );
};
