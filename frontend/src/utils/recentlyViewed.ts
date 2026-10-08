/**
 * Products this browser viewed recently, newest first. Only ids are kept
 * (in localStorage, per device rather than per account): lists fetch the
 * products fresh, so prices, sales and stock are never stale. Storage can be
 * unavailable (private mode, blocked site data); then nothing is remembered.
 */
const STORAGE_KEY = "recently-viewed";
export const MAX_RECENTLY_VIEWED = 12;

const EMPTY: string[] = [];
const listeners = new Set<() => void>();
// The snapshot must keep its identity between changes (useSyncExternalStore)
let snapshot: string[] | null = null;

const read = (): string[] => {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string").slice(0, MAX_RECENTLY_VIEWED) : EMPTY;
  } catch {
    return EMPTY;
  }
};

const write = (ids: string[]): void => {
  snapshot = ids;
  try {
    if (ids.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Still updates this page; just not remembered
  }
  listeners.forEach((notify) => notify());
};

export const getRecentlyViewed = (): string[] => (snapshot ??= read());

export const getServerRecentlyViewed = (): string[] => EMPTY;

/** Move (or add) a product to the front of the list */
export const recordProductView = (productId: string): void => {
  const ids = getRecentlyViewed();
  if (ids[0] === productId) return;
  write([productId, ...ids.filter((id) => id !== productId)].slice(0, MAX_RECENTLY_VIEWED));
};

export const clearRecentlyViewed = (): void => write([]);

/** For useSyncExternalStore; also follows changes made in other tabs */
export const subscribeRecentlyViewed = (notify: () => void): (() => void) => {
  listeners.add(notify);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY && event.key !== null) return;
    snapshot = read();
    notify();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
};

/** Tests only: forget the cached list so the next read comes from storage */
export const resetRecentlyViewedCache = (): void => {
  snapshot = null;
};
