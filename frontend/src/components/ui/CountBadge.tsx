/**
 * CountBadge
 * Small counter pinned to the top-right corner of an icon button (cart,
 * wishlist, notifications). One size and position everywhere; "primary" for
 * counts, "alert" for unread items. Hidden from screen readers: the button's
 * own label carries the count.
 */

interface CountBadgeProps {
  count: number;
  /** Larger counts show as "9+" / "99+" */
  max?: number;
  tone?: "primary" | "alert";
  /** Briefly enlarge (e.g. when an item was just added) */
  bump?: boolean;
}

const TONES = {
  primary: "bg-[var(--color-primary)] text-[var(--color-on-primary)]",
  alert: "bg-[var(--color-error)] text-[var(--color-on-error)]",
};

const CountBadge = ({ count, max = 9, tone = "primary", bump = false }: CountBadgeProps) => {
  if (count <= 0) return null;
  return (
    <span
      aria-hidden="true"
      className={`absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full ring-2 ring-[var(--color-surface)] text-[11px] font-semibold leading-none tabular-nums flex items-center justify-center pointer-events-none transition-transform duration-200 ${TONES[tone]} ${
        bump ? "scale-125" : "scale-100"
      }`}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
};

export default CountBadge;
