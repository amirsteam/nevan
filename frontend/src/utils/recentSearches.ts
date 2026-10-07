/**
 * Recent storefront searches (per browser; a convenience only)
 */
const RECENT_KEY = "nevan-recent-searches";
const MAX_RECENT = 5;

export const readRecentSearches = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string").slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
};

export const rememberSearch = (query: string): void => {
  try {
    const next = [query, ...readRecentSearches().filter((q) => q.toLowerCase() !== query.toLowerCase())].slice(
      0,
      MAX_RECENT,
    );
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // Not remembered; search still works
  }
};
