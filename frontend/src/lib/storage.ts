interface CacheWrapper<T> {
  data: T;
  expiresAt?: number;
  ttlMs?: number;
}

function* iterStorageKeys(store: Storage = localStorage) {
  for (let i = 0; i < store.length; i++) {
    yield store.key(i);
  }
}
const setItem = (
  key: string,
  value: CacheWrapper<any>,
  store: Storage = localStorage,
) => {
  try {
    const str = JSON.stringify(value);
    store.setItem(key, str);
  } catch (e) {
    console.error("Storage failed", e);
  }
};

const getItem = (
  key: string,
  store: Storage = localStorage,
): CacheWrapper<any> | null => {
  try {
    const str = store.getItem(key) as string;
    return JSON.parse(str);
  } catch (e) {
    return null;
  }
};

const removeItem = (key: string, store: Storage = localStorage) => {
  try {
    store.removeItem(key);
  } catch (e) {}
};

export const secureStorage = {
  /**
   * Purges all expired TTL cache items on tab/page startup.
   */
  purgeExpiredOnStartup: (store: Storage = localStorage) => {
    const keysToRemove: string[] = [];
    try {
      for (const key of iterStorageKeys(store)) {
        if (key && key.startsWith("edu_rag_")) {
          const value = getItem(key);
          if (!value) continue;
          try {
            if (typeof value.expiresAt === "number") {
              if (Date.now() > value.expiresAt) {
                keysToRemove.push(key);
              }
            }
          } catch (e) {
            // Ignore non-wrapper items
          }
        }
      }
    } catch (e) {
      console.warn("Startup TTL purge failed:", e);
    } finally {
      keysToRemove.forEach((key) => removeItem(key));
    }
  },

  /**
   * Clears all cached RAG workspace keys
   */
  clearCache: (store: Storage = localStorage) => {
    const keysToRemove: string[] = [];
    try {
      for (const key of iterStorageKeys(store)) {
        if (key && key.startsWith("edu_rag_")) {
          keysToRemove.push(key);
        }
      }
    } catch (e) {
      console.error("Failed to clear cache", e);
    } finally {
      keysToRemove.forEach((key) => removeItem(key));
    }
  },

  /**
   * Stores data securely with an absolute expiresAt TTL timestamp.
   * Useful for caching database responses so frequent context switches don't hit the DB.
   */
  setCachedItemWithTTL: <T>(
    key: string,
    data: T,
    ttlMs: number = 0,
    store: Storage = localStorage,
  ): void => {
    const wrapper: CacheWrapper<T> = {
      data,
      ...(ttlMs > 0
        ? {
            expiresAt: Date.now() + ttlMs,
            ttlMs,
          }
        : {}),
    };
    setItem(key, wrapper, store);
  },

  /**
   * Retrieves cached data if it exists and has not expired according to its expiresAt TTL.
   * Returns null if missing, invalid, or expired.
   */
  getCachedItemWithTTL: <T>(
    key: string,
    store: Storage = localStorage,
  ): T | null => {
    const cache = getItem(key);
    if (!cache) return null;
    try {
      if (cache.ttlMs === undefined || cache.ttlMs <= 0) return cache.data as T;
      if (typeof cache.expiresAt === "number") {
        if (Date.now() < cache.expiresAt) {
          cache.expiresAt = Date.now() + cache.ttlMs;
          setItem(key, cache, store);
          return cache.data as T;
        } else {
          removeItem(key);
        }
      }
    } catch (e) {
      console.warn(`Failed to parse TTL cache for key: ${key}`, e);
    }
    return null;
  },
};
