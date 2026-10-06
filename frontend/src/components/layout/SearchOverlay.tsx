/**
 * SearchOverlay
 * Full-width search for screens without the inline header search: product
 * suggestions as you type (debounced) and recent searches.
 */
import { useEffect, useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, X, Clock, Loader2 } from "lucide-react";
import Modal from "../ui/Modal";
import { productsAPI } from "../../api";
import { formatPrice } from "../../utils/helpers";
import { imageUrl } from "../../utils/image";
import type { IProduct } from "../../types";

const RECENT_KEY = "nevan-recent-searches";

const readRecent = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string").slice(0, 5) : [];
  } catch {
    return [];
  }
};

export const rememberSearch = (query: string): void => {
  try {
    const next = [query, ...readRecent().filter((q) => q.toLowerCase() !== query.toLowerCase())].slice(0, 5);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Not remembered; search still works
  }
};

interface SearchOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

const SearchOverlay = ({ isOpen, onClose }: SearchOverlayProps) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      setRecent(readRecent());
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    let cancelled = false;
    const timer = setTimeout(() => {
      productsAPI
        .getProducts({ search: q, limit: 5 })
        .then((res) => !cancelled && setResults(res.data.products || []))
        .catch(() => !cancelled && setResults([]))
        .finally(() => !cancelled && setLoading(false));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const go = (q: string) => {
    const trimmed = q.trim();
    if (!trimmed) return;
    rememberSearch(trimmed);
    onClose();
    navigate(`/products?search=${encodeURIComponent(trimmed)}`);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    go(query);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel="Search products" showCloseButton={false} size="lg" className="self-start mt-2 sm:mt-16" bodyClassName="p-0">
      <form onSubmit={onSubmit} role="search" className="flex items-center gap-2 p-3 border-b border-[var(--color-border)]">
        <Search className="w-5 h-5 text-[var(--color-text-muted)] shrink-0 ml-1" aria-hidden="true" />
        <label htmlFor="overlay-search" className="sr-only">
          Search products
        </label>
        <input
          id="overlay-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search rompers, sweaters, gift sets…"
          autoComplete="off"
          enterKeyHint="search"
          className="flex-1 min-w-0 bg-transparent outline-none text-base py-2"
        />
        {loading && <Loader2 className="w-4 h-4 animate-spin text-[var(--color-text-muted)]" aria-hidden="true" />}
        <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--color-surface-muted)]" aria-label="Close search">
          <X className="w-5 h-5" aria-hidden="true" />
        </button>
      </form>

      <div className="max-h-[60vh] overflow-y-auto">
        {query.trim().length >= 2 ? (
          <>
            {results.length > 0 ? (
              <ul aria-label="Suggestions" className="py-2">
                {results.map((product) => (
                  <li key={product._id}>
                    <Link
                      to={`/products/${product.slug}`}
                      onClick={() => {
                        rememberSearch(query.trim());
                        onClose();
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--color-surface-muted)]"
                    >
                      <img
                        src={imageUrl(product.images?.[0]?.url, 96)}
                        alt=""
                        className="w-12 h-12 rounded-lg object-cover bg-[var(--color-surface-muted)] shrink-0"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium truncate">{product.name}</span>
                        <span className="block text-sm text-[var(--color-primary)] font-semibold">{formatPrice(product.price)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              !loading && <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">No products match “{query.trim()}”.</p>
            )}
            <button
              type="button"
              onClick={() => go(query)}
              className="w-full text-left px-4 py-3 border-t border-[var(--color-border)] text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-surface-muted)]"
            >
              See all results for “{query.trim()}”
            </button>
          </>
        ) : recent.length > 0 ? (
          <div className="py-2">
            <p className="px-4 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)]">Recent searches</p>
            <ul>
              {recent.map((q) => (
                <li key={q}>
                  <button
                    type="button"
                    onClick={() => go(q)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left hover:bg-[var(--color-surface-muted)]"
                  >
                    <Clock className="w-4 h-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="px-4 py-6 text-sm text-[var(--color-text-muted)]">Type at least 2 letters to see suggestions.</p>
        )}
      </div>
    </Modal>
  );
};

export default SearchOverlay;
