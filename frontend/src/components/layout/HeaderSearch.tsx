/**
 * HeaderSearch
 * Inline search for wide screens (ARIA combobox): product suggestions as you
 * type, recent searches when empty, arrow keys + Enter to pick, Escape to
 * close. On the results page the box keeps showing the current search.
 */
import { useId, useRef, useState, FormEvent, KeyboardEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Clock, Loader2 } from "lucide-react";
import ProductSuggestion from "./ProductSuggestion";
import { useProductSuggestions } from "../../hooks/useProductSuggestions";
import { readRecentSearches, rememberSearch } from "../../utils/recentSearches";
import type { IProduct } from "../../types";

type Option =
  | { kind: "product"; product: IProduct }
  | { kind: "recent"; query: string }
  | { kind: "all"; query: string };

const HeaderSearch = ({ className = "" }: { className?: string }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);

  // Follow the URL: show the current search on /products, empty elsewhere
  const urlQuery = location.pathname === "/products" ? new URLSearchParams(location.search).get("search") ?? "" : "";
  const [lastUrlQuery, setLastUrlQuery] = useState(urlQuery);
  const [query, setQuery] = useState(urlQuery);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);
  if (lastUrlQuery !== urlQuery) {
    setLastUrlQuery(urlQuery);
    setQuery(urlQuery);
    setOpen(false);
  }

  const { trimmedQuery, searching, results, loading } = useProductSuggestions(query);

  const options: Option[] = searching
    ? [...results.map((product): Option => ({ kind: "product", product })), { kind: "all", query: trimmedQuery }]
    : recent.map((q): Option => ({ kind: "recent", query: q }));
  const expanded = open && (options.length > 0 || loading);

  const close = () => {
    setOpen(false);
    setActiveIndex(-1);
  };

  const search = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    rememberSearch(trimmed);
    close();
    inputRef.current?.blur();
    navigate(`/products?search=${encodeURIComponent(trimmed)}`);
  };

  const choose = (option: Option) => {
    if (option.kind === "product") {
      rememberSearch(trimmedQuery);
      close();
      inputRef.current?.blur();
      navigate(`/products/${option.product.slug}`);
    } else {
      search(option.query);
    }
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (expanded && activeIndex >= 0 && options[activeIndex]) choose(options[activeIndex]);
    else search(query);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) setOpen(true);
      if (options.length === 0) return;
      // Cycle through the options and back to the input itself (-1)
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((i) => {
        const next = i + step;
        if (next >= options.length) return -1;
        if (next < -1) return options.length - 1;
        return next;
      });
    } else if (e.key === "Escape") {
      if (expanded) {
        e.preventDefault();
        e.stopPropagation();
        close();
      } else if (query) {
        setQuery("");
      }
    }
  };

  const optionId = (i: number) => `${id}-option-${i}`;

  return (
    <div
      className={`relative ${className}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) close();
      }}
    >
      <form onSubmit={onSubmit} role="search">
        <div className="input-group">
          <Search className="input-icon w-4 h-4" aria-hidden="true" />
          <label htmlFor={`${id}-input`} className="sr-only">
            Search products
          </label>
          <input
            ref={inputRef}
            id={`${id}-input`}
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-activedescendant={expanded && activeIndex >= 0 ? optionId(activeIndex) : undefined}
            autoComplete="off"
            enterKeyHint="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setActiveIndex(-1);
            }}
            onFocus={() => {
              setRecent(readRecentSearches());
              setOpen(true);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search rompers, sweaters…"
            className="input w-64 2xl:w-80 py-2 text-sm bg-[var(--color-surface-muted)] border-transparent focus:bg-[var(--color-surface)] focus:border-[var(--color-primary)]"
          />
        </div>
      </form>

      <div
        className={`absolute right-0 top-full mt-2 w-[26rem] max-w-[calc(100vw-2rem)] bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-[var(--shadow-lg)] overflow-hidden z-50 ${
          expanded ? "animate-fadeIn" : "hidden"
        }`}
      >
        {!searching && recent.length > 0 && (
          <p className="px-4 pt-3 pb-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Recent searches</p>
        )}
        {searching && loading && results.length === 0 && (
          <p className="flex items-center gap-2 px-4 py-3 text-sm text-[var(--color-text-muted)]">
            <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            Searching…
          </p>
        )}
        {searching && !loading && results.length === 0 && (
          <p className="px-4 py-3 text-sm text-[var(--color-text-muted)]">No products match “{trimmedQuery}”.</p>
        )}
        <ul
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          className="max-h-[60vh] overflow-y-auto py-1"
          // Keep focus in the input while clicking an option
          onMouseDown={(e) => e.preventDefault()}
        >
          {options.map((option, i) => {
            const active = i === activeIndex;
            const base = `flex items-center gap-3 px-4 cursor-pointer ${active ? "bg-[var(--color-surface-muted)]" : "hover:bg-[var(--color-surface-muted)]"}`;
            if (option.kind === "product") {
              return (
                <li key={option.product._id} id={optionId(i)} role="option" aria-selected={active} onClick={() => choose(option)} className={`${base} py-2`}>
                  <ProductSuggestion product={option.product} />
                </li>
              );
            }
            if (option.kind === "recent") {
              return (
                <li key={`recent-${option.query}`} id={optionId(i)} role="option" aria-selected={active} onClick={() => choose(option)} className={`${base} py-2.5 text-sm`}>
                  <Clock className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" aria-hidden="true" />
                  <span className="truncate">{option.query}</span>
                </li>
              );
            }
            return (
              <li
                key="all"
                id={optionId(i)}
                role="option"
                aria-selected={active}
                onClick={() => choose(option)}
                className={`${base} py-3 mt-1 border-t border-[var(--color-border)] text-sm font-medium text-[var(--color-primary)]`}
              >
                <Search className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span className="truncate">See all results for “{option.query}”</span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default HeaderSearch;
