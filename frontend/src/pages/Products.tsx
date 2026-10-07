/**
 * Products Page
 * Product listing with URL-driven filters (category, search, price, age,
 * gender, sort), active-filter chips, and a bottom-sheet filter panel on phones
 */
import { useState, useEffect, useMemo, FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { productsAPI, categoriesAPI } from "../api";
import type { ProductQueryParams } from "../api";
import ProductCard from "../components/ProductCard";
import Breadcrumb from "../components/ui/Breadcrumb";
import Modal from "../components/ui/Modal";
import Pagination from "../components/ui/Pagination";
import EmptyState from "../components/ui/EmptyState";
import { ProductGridSkeleton } from "../components/ui/Skeleton";
import { AGE_GROUPS, GENDER_LABELS, PRODUCT_GENDERS, formatAgeGroup } from "../config/store";
import { formatPrice } from "../utils/helpers";
import { usePageTitle } from "../hooks/usePageTitle";
import type { ICategory, IPagination, IProduct } from "../types";

const SORT_OPTIONS = [
  { value: "-createdAt", label: "Newest" },
  { value: "-soldCount", label: "Best selling" },
  { value: "price", label: "Price: low to high" },
  { value: "-price", label: "Price: high to low" },
  { value: "-ratings.average", label: "Top rated" },
];

const PAGE_SIZE = 12;

interface FiltersProps {
  categories: ICategory[];
  current: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onPriceApply: (min: string, max: string) => void;
}

const chipClass = (active: boolean) =>
  `px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
    active
      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]"
      : "border-[var(--color-border)] hover:border-[var(--color-primary)]"
  }`;

const FilterGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <fieldset className="space-y-3">
    <legend className="font-semibold text-sm mb-3">{title}</legend>
    {children}
  </fieldset>
);

/** Filter controls shared by the desktop sidebar and the mobile sheet */
const Filters = ({ categories, current, onChange, onPriceApply }: FiltersProps) => {
  const [min, setMin] = useState(current.minPrice);
  const [max, setMax] = useState(current.maxPrice);
  // Follow the URL when the price filter changes elsewhere (chips, "Clear all")
  const [applied, setApplied] = useState({ min: current.minPrice, max: current.maxPrice });
  if (applied.min !== current.minPrice || applied.max !== current.maxPrice) {
    setApplied({ min: current.minPrice, max: current.maxPrice });
    setMin(current.minPrice);
    setMax(current.maxPrice);
  }

  const submitPrice = (e: FormEvent) => {
    e.preventDefault();
    onPriceApply(min, max);
  };

  return (
    <div className="space-y-7">
      <FilterGroup title="Category">
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={!current.category} onClick={() => onChange("category", "")} className={chipClass(!current.category)}>
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat._id}
              type="button"
              aria-pressed={current.category === cat.slug}
              onClick={() => onChange("category", cat.slug)}
              className={chipClass(current.category === cat.slug)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="Age">
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={!current.age} onClick={() => onChange("age", "")} className={chipClass(!current.age)}>
            All ages
          </button>
          {AGE_GROUPS.map((age) => (
            <button
              key={age}
              type="button"
              aria-pressed={current.age === age}
              onClick={() => onChange("age", age)}
              className={chipClass(current.age === age)}
            >
              {formatAgeGroup(age)}
            </button>
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title="For">
        <div className="flex flex-wrap gap-2">
          <button type="button" aria-pressed={!current.gender} onClick={() => onChange("gender", "")} className={chipClass(!current.gender)}>
            Everyone
          </button>
          {PRODUCT_GENDERS.map((g) => (
            <button
              key={g}
              type="button"
              aria-pressed={current.gender === g}
              onClick={() => onChange("gender", g)}
              className={chipClass(current.gender === g)}
            >
              {GENDER_LABELS[g]}
            </button>
          ))}
        </div>
        <p className="text-xs text-[var(--color-text-muted)]">Boy and Girl include unisex styles.</p>
      </FilterGroup>

      <FilterGroup title="Price (NPR)">
        <form onSubmit={submitPrice} className="flex items-end gap-2">
          <label className="flex-1">
            <span className="block text-xs text-[var(--color-text-muted)] mb-1">Min</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={min}
              onChange={(e) => setMin(e.target.value)}
              placeholder="0"
              className="input text-sm"
            />
          </label>
          <label className="flex-1">
            <span className="block text-xs text-[var(--color-text-muted)] mb-1">Max</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={max}
              onChange={(e) => setMax(e.target.value)}
              placeholder="Any"
              className="input text-sm"
            />
          </label>
          <button type="submit" className="btn btn-secondary text-sm px-3">
            Apply
          </button>
        </form>
      </FilterGroup>
    </div>
  );
};

const Products = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<IProduct[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [pagination, setPagination] = useState<IPagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const current = useMemo(
    () => ({
      page: searchParams.get("page") || "1",
      category: searchParams.get("category") || "",
      search: searchParams.get("search") || "",
      sort: searchParams.get("sort") || "-createdAt",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      age: searchParams.get("age") || "",
      gender: searchParams.get("gender") || "",
    }),
    [searchParams],
  );
  const currentPage = parseInt(current.page, 10) || 1;
  const [searchText, setSearchText] = useState(current.search);

  // Keep the box in sync when the URL changes elsewhere (header search, chips)
  useEffect(() => setSearchText(current.search), [current.search]);

  const updateFilters = (changes: Record<string, string | number>) => {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, String(value));
      else next.delete(key);
    }
    if (!("page" in changes)) next.delete("page");
    setSearchParams(next);
  };

  // Debounced search: one timer, reset on each keystroke
  useEffect(() => {
    if (searchText.trim() === current.search) return;
    const timer = setTimeout(() => updateFilters({ search: searchText.trim() }), 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchText]);

  useEffect(() => {
    let cancelled = false;
    const fetchProducts = async () => {
      setLoading(true);
      setError(false);
      try {
        const params: ProductQueryParams = { page: currentPage, limit: PAGE_SIZE, sort: current.sort };
        if (current.category) params.category = current.category;
        if (current.search) params.search = current.search;
        if (current.minPrice) params.minPrice = current.minPrice;
        if (current.maxPrice) params.maxPrice = current.maxPrice;
        if (current.age) params.age = current.age;
        if (current.gender) params.gender = current.gender;

        const response = await productsAPI.getProducts(params);
        if (cancelled) return;
        setProducts(response.data.products);
        setPagination(response.pagination ?? null);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchProducts();
    return () => {
      cancelled = true;
    };
  }, [current, currentPage, reloadKey]);

  useEffect(() => {
    categoriesAPI
      .getCategories()
      .then((response) => setCategories(response.data.categories))
      .catch(() => {});
  }, []);

  const categoryName = categories.find((c) => c.slug === current.category)?.name;
  const heading = current.search
    ? `Results for “${current.search}”`
    : categoryName || (current.age ? `Clothing for ${formatAgeGroup(current.age)}` : "All products");
  usePageTitle(heading);

  // Removable chips for everything that narrows the list
  const chips = [
    current.search && { key: "search", label: `“${current.search}”` },
    current.category && { key: "category", label: categoryName || current.category },
    current.age && { key: "age", label: formatAgeGroup(current.age) },
    current.gender && { key: "gender", label: GENDER_LABELS[current.gender as keyof typeof GENDER_LABELS] || current.gender },
    (current.minPrice || current.maxPrice) && {
      key: "price",
      label: `${current.minPrice ? formatPrice(Number(current.minPrice)) : "NPR 0"} – ${
        current.maxPrice ? formatPrice(Number(current.maxPrice)) : "any"
      }`,
    },
  ].filter(Boolean) as { key: string; label: string }[];

  const removeChip = (key: string) =>
    key === "price" ? updateFilters({ minPrice: "", maxPrice: "" }) : updateFilters({ [key]: "" });

  const clearFilters = () => setSearchParams(current.sort !== "-createdAt" ? { sort: current.sort } : {});

  const filterProps: FiltersProps = {
    categories,
    current,
    onChange: (key, value) => updateFilters({ [key]: value }),
    onPriceApply: (min, max) => updateFilters({ minPrice: min, maxPrice: max }),
  };

  const total = pagination?.totalItems ?? products.length;

  return (
    <div className="container-app py-6 md:py-8">
      <Breadcrumb items={[{ label: "Shop" }]} className="mb-5" />

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Desktop filters */}
        <aside className="hidden lg:block w-64 shrink-0" aria-label="Filters">
          <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-2">
            <Filters {...filterProps} />
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <div className="flex flex-col gap-4 mb-5">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">{heading}</h1>
              <p className="text-sm text-[var(--color-text-muted)] mt-1" aria-live="polite">
                {loading ? "Loading products…" : `${total} ${total === 1 ? "product" : "products"}`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[12rem]">
                <label htmlFor="product-search" className="sr-only">
                  Search products
                </label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                <input
                  id="product-search"
                  type="search"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search rompers, sweaters…"
                  className="input pl-10"
                />
              </div>

              <button
                type="button"
                onClick={() => setShowFilters(true)}
                className="lg:hidden btn btn-secondary text-sm"
                aria-haspopup="dialog"
              >
                <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
                Filters
                {chips.length > 0 && (
                  <span className="ml-1 min-w-5 h-5 px-1 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] text-xs flex items-center justify-center">
                    {chips.length}
                  </span>
                )}
              </button>

              <label className="flex items-center gap-2 text-sm">
                <span className="text-[var(--color-text-muted)] hidden sm:inline">Sort</span>
                <span className="sr-only sm:hidden">Sort by</span>
                <select
                  value={current.sort}
                  onChange={(e) => updateFilters({ sort: e.target.value })}
                  className="select text-sm w-auto py-2"
                >
                  {SORT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {chips.length > 0 && (
              <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
                {chips.map((chip) => (
                  <li key={chip.key}>
                    <button
                      type="button"
                      onClick={() => removeChip(chip.key)}
                      className="inline-flex items-center gap-1.5 pl-3 pr-2 py-1 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary)] text-sm font-medium hover:bg-[var(--color-primary-light)]/40"
                      aria-label={`Remove filter: ${chip.label}`}
                    >
                      {chip.label}
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </li>
                ))}
                <li>
                  <button type="button" onClick={clearFilters} className="text-sm text-[var(--color-text-muted)] underline underline-offset-4 hover:text-[var(--color-primary)]">
                    Clear all
                  </button>
                </li>
              </ul>
            )}
          </div>

          {loading ? (
            <ProductGridSkeleton count={6} className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6" />
          ) : error ? (
            <EmptyState
              type="generic"
              title="Couldn't load products"
              description="Please check your connection and try again."
              actionLabel="Try again"
              onAction={() => setReloadKey((k) => k + 1)}
            />
          ) : products.length === 0 ? (
            <EmptyState
              type={current.search ? "search" : "products"}
              description={
                current.age || current.gender
                  ? "No products are tagged for this age or style yet. Try another filter, or ask us on chat — we're happy to help."
                  : undefined
              }
              actionLabel="Clear filters"
              onAction={clearFilters}
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
              {products.map((product, i) => (
                <ProductCard key={product._id} product={product} priority={i < 2} />
              ))}
            </div>
          )}

          {pagination && pagination.totalPages > 1 && !loading && (
            <Pagination
              className="mt-10"
              currentPage={currentPage}
              totalPages={pagination.totalPages}
              onPageChange={(page) => {
                updateFilters({ page });
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          )}
        </div>
      </div>

      {/* Mobile filters */}
      <Modal
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        title="Filters"
        variant="sheet"
        footer={
          <>
            {chips.length > 0 && (
              <button type="button" onClick={clearFilters} className="btn btn-secondary">
                Clear all
              </button>
            )}
            <button type="button" onClick={() => setShowFilters(false)} className="btn btn-primary flex-1 sm:flex-none">
              {loading ? "Show results" : `Show ${total} ${total === 1 ? "result" : "results"}`}
            </button>
          </>
        }
      >
        <Filters {...filterProps} />
      </Modal>
    </div>
  );
};

export default Products;
