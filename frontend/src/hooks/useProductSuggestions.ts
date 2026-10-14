/**
 * Product suggestions while typing a search (debounced), shared by the
 * desktop header search and the search overlay.
 */
import { useEffect, useState } from "react";
import { productsAPI } from "../api";
import type { IProduct } from "../types";

export const MIN_SUGGEST_LENGTH = 2;

export const useProductSuggestions = (query: string, limit = 5) => {
  const trimmedQuery = query.trim();
  // Results remember which query they answer, so "loading" is simply
  // "the current query has no answer yet" (no state reset needed)
  const [found, setFound] = useState<{ query: string; products: IProduct[] }>({ query: "", products: [] });

  const searching = trimmedQuery.length >= MIN_SUGGEST_LENGTH;
  const results = searching && found.query === trimmedQuery ? found.products : [];
  const loading = searching && found.query !== trimmedQuery;

  useEffect(() => {
    if (trimmedQuery.length < MIN_SUGGEST_LENGTH) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      productsAPI
        .getProducts({ search: trimmedQuery, limit })
        .then((res) => !cancelled && setFound({ query: trimmedQuery, products: res.data.products || [] }))
        .catch(() => !cancelled && setFound({ query: trimmedQuery, products: [] }));
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [trimmedQuery, limit]);

  return { trimmedQuery, searching, results, loading };
};
