/**
 * Simple in-memory cache utility
 * For small to medium scale applications
 * Consider Redis for larger scale deployments
 */

interface CacheItem<T> {
  value: T;
  expiry: number;
}

class MemoryCache {
  private cache: Map<string, CacheItem<any>> = new Map();
  private defaultTTL: number;

  constructor(defaultTTL: number = 300) {
    // Default 5 minutes TTL
    this.defaultTTL = defaultTTL * 1000;

    // Clean expired items every minute
    setInterval(() => this.cleanup(), 60 * 1000);
  }

  /**
   * Get a cached value
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  /**
   * Set a cached value
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in seconds (optional, uses default if not provided)
   */
  set<T>(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl ? ttl * 1000 : this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  /**
   * Delete a cached value
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Delete all cached values matching a pattern
   */
  deletePattern(pattern: string): number {
    let deleted = 0;
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deleted++;
      }
    }
    return deleted;
  }

  /**
   * Clear all cached values
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Clean up expired items
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
}

// Export a singleton instance
export const cache = new MemoryCache(300); // 5 minute default TTL

// Cache keys constants
export const CACHE_KEYS = {
  CATEGORIES: "categories",
  CATEGORY_TREE: "category_tree",
  FEATURED_PRODUCTS: (limit: number) => `featured_products_${limit}`,
  PRODUCT: (slug: string) => `product_${slug}`,
};

export default cache;
