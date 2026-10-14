/**
 * ShopMenu
 * Desktop "Shop" disclosure in the header: a full-width panel with age bands,
 * boy/girl/unisex, top categories and quick links. Opens on click, Enter or
 * mouse hover; closes on Escape (focus back on the trigger), an outside click,
 * leaving it with the mouse or keyboard, or choosing a link.
 */
import { useEffect, useId, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, ArrowRight } from "lucide-react";
import { AGE_GROUPS } from "../../config/store";
import { AGE_LABELS, GENDER_LINKS, NEW_IN_PATH, ageLink, genderLink, splitAge } from "../../utils/shopLinks";
import { useNavCategories } from "../../hooks/useNavCategories";
import CategoryThumb from "../CategoryThumb";

const MAX_CATEGORIES = 8;

const heading = "text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)] mb-3";
const panelLink = "block rounded-lg px-3 py-2 text-sm hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-primary)] transition-colors";

interface ShopMenuProps {
  /** Trigger classes shared with the other header nav links */
  linkClassName: (active: boolean) => string;
  active: boolean;
}

const ShopMenu = ({ linkClassName, active }: ShopMenuProps) => {
  const location = useLocation();
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const openedByHover = useRef(false);
  const categories = useNavCategories(open);

  // Close after navigating (adjusting state during render, not in an effect)
  const route = location.pathname + location.search;
  const [lastRoute, setLastRoute] = useState(route);
  if (lastRoute !== route) {
    setLastRoute(route);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  return (
    <div
      ref={wrapperRef}
      onPointerEnter={(e) => {
        if (e.pointerType !== "mouse") return;
        window.clearTimeout(closeTimer.current);
        if (!open) openedByHover.current = true;
        setOpen(true);
      }}
      onPointerLeave={(e) => {
        if (e.pointerType !== "mouse") return;
        closeTimer.current = window.setTimeout(() => setOpen(false), 150);
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          // A click right after hovering keeps the panel open instead of toggling it shut
          setOpen((o) => (openedByHover.current ? true : !o));
          openedByHover.current = false;
        }}
        className={linkClassName(active || open)}
      >
        Shop
        <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden="true" />
      </button>

      {open && (
        <div
          id={panelId}
          className="absolute inset-x-0 top-full border-t border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-lg)] animate-fadeIn"
          onClick={(e) => {
            if ((e.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          <div className="container-app grid grid-cols-12 gap-8 py-8">
            <div className="col-span-5">
              <p className={heading}>Shop by age</p>
              <ul aria-label="Shop by age" className="grid grid-cols-2 gap-x-2">
                {AGE_GROUPS.map((age) => {
                  const [range, unit] = splitAge(age);
                  return (
                    <li key={age}>
                      <Link to={ageLink(age)} className={`${panelLink} flex items-baseline justify-between gap-3`}>
                        <span className="font-medium">{AGE_LABELS[age]}</span>
                        <span className="text-xs text-[var(--color-text-muted)] tabular-nums">
                          {range} {unit}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="col-span-2">
              <p className={heading}>Shopping for</p>
              <ul aria-label="Shopping for">
                {GENDER_LINKS.map(({ value, label }) => (
                  <li key={value}>
                    <Link to={genderLink(value)} className={`${panelLink} font-medium`}>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="col-span-3">
              <p className={heading}>Categories</p>
              {categories.length === 0 ? (
                <div className="space-y-3 px-3 pt-1" aria-hidden="true">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="h-3.5 w-28 rounded bg-[var(--color-surface-muted)] animate-pulse" />
                  ))}
                </div>
              ) : (
                <ul aria-label="Categories">
                  {categories.slice(0, MAX_CATEGORIES).map((category) => (
                    <li key={category._id}>
                      <Link to={`/products?category=${category.slug}`} className={`${panelLink} flex items-center gap-2.5`}>
                        <CategoryThumb category={category} size={28} />
                        {category.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to="/categories"
                className="mt-2 inline-flex items-center gap-1 px-3 text-sm font-medium text-[var(--color-primary)] hover:underline underline-offset-4"
              >
                All categories
                <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>

            <div className="col-span-2 flex flex-col gap-3">
              <Link
                to="/products"
                className="group flex-1 rounded-xl bg-[var(--color-primary-soft)] p-4 transition-shadow hover:shadow-[var(--shadow-md)]"
              >
                <span className="block font-display text-lg font-semibold text-[var(--color-primary)]">Shop all</span>
                <span className="mt-1 flex items-center gap-1 text-sm text-[var(--color-text-muted)]">
                  Everything in store
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
              <Link
                to={NEW_IN_PATH}
                className="group flex-1 rounded-xl bg-[var(--color-accent-light)] p-4 transition-shadow hover:shadow-[var(--shadow-md)]"
              >
                <span className="block font-display text-lg font-semibold text-[var(--color-text)]">New in</span>
                <span className="mt-1 flex items-center gap-1 text-sm text-[var(--color-text)]">
                  Latest arrivals
                  <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShopMenu;
