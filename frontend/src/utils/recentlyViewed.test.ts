import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  MAX_RECENTLY_VIEWED,
  clearRecentlyViewed,
  getRecentlyViewed,
  recordProductView,
  resetRecentlyViewedCache,
  subscribeRecentlyViewed,
} from "./recentlyViewed";

describe("recently viewed products", () => {
  beforeEach(() => {
    localStorage.clear();
    resetRecentlyViewedCache();
  });

  it("keeps ids newest first, without duplicates, and remembers them", () => {
    recordProductView("a");
    recordProductView("b");
    recordProductView("a");
    expect(getRecentlyViewed()).toEqual(["a", "b"]);
    expect(JSON.parse(localStorage.getItem("recently-viewed")!)).toEqual(["a", "b"]);

    resetRecentlyViewedCache();
    expect(getRecentlyViewed()).toEqual(["a", "b"]);
  });

  it(`keeps only the last ${MAX_RECENTLY_VIEWED}`, () => {
    for (let i = 0; i < MAX_RECENTLY_VIEWED + 3; i++) recordProductView(`p${i}`);
    const ids = getRecentlyViewed();
    expect(ids).toHaveLength(MAX_RECENTLY_VIEWED);
    expect(ids[0]).toBe(`p${MAX_RECENTLY_VIEWED + 2}`);
    expect(ids).not.toContain("p0");
  });

  it("notifies subscribers and clears everything", () => {
    const notify = vi.fn();
    const unsubscribe = subscribeRecentlyViewed(notify);
    recordProductView("a");
    expect(notify).toHaveBeenCalledTimes(1);
    // Viewing the newest one again changes nothing
    recordProductView("a");
    expect(notify).toHaveBeenCalledTimes(1);

    clearRecentlyViewed();
    expect(getRecentlyViewed()).toEqual([]);
    expect(localStorage.getItem("recently-viewed")).toBeNull();
    unsubscribe();
  });

  it("survives corrupt or unavailable storage", () => {
    localStorage.setItem("recently-viewed", "{not json");
    expect(getRecentlyViewed()).toEqual([]);

    resetRecentlyViewedCache();
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    recordProductView("a");
    // Still works for this page, just isn't saved
    expect(getRecentlyViewed()).toEqual(["a"]);
    setItem.mockRestore();
  });
});
