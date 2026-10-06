/**
 * 404 Page
 * Search plus popular destinations, so a dead link isn't a dead end
 */
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { categoriesAPI } from "../api";
import { usePageTitle } from "../hooks/usePageTitle";
import type { ICategory } from "../types";

const NotFound = () => {
  usePageTitle("Page not found");
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [categories, setCategories] = useState<ICategory[]>([]);

  useEffect(() => {
    categoriesAPI
      .getCategories()
      .then((res) => setCategories((res.data.categories || []).slice(0, 6)))
      .catch(() => {});
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigate(`/products?search=${encodeURIComponent(query.trim())}`);
  };

  return (
    <div className="container-app py-16 md:py-24 text-center max-w-xl">
      <p className="text-6xl mb-4" aria-hidden="true">
        🧸
      </p>
      <h1 className="text-3xl md:text-4xl font-bold mb-3">We can't find that page</h1>
      <p className="text-[var(--color-text-muted)] mb-8">
        The link may be old or mistyped. Try searching, or pick up where most shoppers start.
      </p>

      <form onSubmit={onSubmit} role="search" className="flex gap-2 mb-8">
        <label htmlFor="notfound-search" className="sr-only">
          Search products
        </label>
        <div className="input-group flex-1">
          <Search className="input-icon w-4 h-4" aria-hidden="true" />
          <input
            id="notfound-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="input"
          />
        </div>
        <button type="submit" className="btn btn-primary">
          Search
        </button>
      </form>

      <div className="flex flex-wrap justify-center gap-2">
        <Link to="/" className="btn btn-secondary text-sm">
          Home
        </Link>
        <Link to="/products" className="btn btn-secondary text-sm">
          Shop all
        </Link>
        {categories.map((cat) => (
          <Link key={cat._id} to={`/products?category=${cat.slug}`} className="btn btn-secondary text-sm">
            {cat.name}
          </Link>
        ))}
      </div>
    </div>
  );
};

export default NotFound;
