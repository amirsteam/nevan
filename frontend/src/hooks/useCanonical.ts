/**
 * Keeps <link rel="canonical"> pointing at the current page while browsing
 * (index.html starts with the home page's). Search engines render the app, so
 * a canonical stuck on the home page would mark every page as a duplicate of
 * it. The site's own domain is taken from that link, so local builds still
 * point at the live site. On the product list only the filters that make a
 * distinct page (category, age, gender) are kept, not paging or sort order.
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const LIST_PARAMS = ["category", "age", "gender"];

export const canonicalFor = (origin: string, pathname: string, search: string): string => {
  const kept = new URLSearchParams();
  if (pathname === "/products") {
    const params = new URLSearchParams(search);
    for (const key of LIST_PARAMS) {
      const value = params.get(key);
      if (value) kept.set(key, value);
    }
  }
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const query = kept.toString();
  return `${origin}${path}${query ? `?${query}` : ""}`;
};

export const useCanonical = (): void => {
  const { pathname, search } = useLocation();
  useEffect(() => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) return;
    try {
      link.href = canonicalFor(new URL(link.href).origin, pathname, search);
    } catch {
      // a malformed href: leave it
    }
  }, [pathname, search]);
};
