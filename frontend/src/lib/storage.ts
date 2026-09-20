import { logger } from './logger';

export interface CacheWrapper<T> {
  data: T;
  lastModified?: string;
  cachedAt: number;
  ttlMs: number;
  expiresAt: number;
}

export interface CachedItemDetails<T> {
  data: T;
  lastModified?: string;
  isExpired: boolean;
  cachedAt: number;
  ttlMs: number;
  expiresAt: number;
}

export interface FetcherResult<T> {
  data: T;
  lastModified?: string;
}

export type FetcherFn<T> = () => Promise<FetcherResult<T> | T>;
export type ValidatorFn<T> = (cached: CachedItemDetails<T>) => Promise<boolean> | boolean;

export interface GetCacheOptions<T> {
  fetcher: FetcherFn<T>;
  validator?: ValidatorFn<T>;
  ttlMs?: number;
  forceRefresh?: boolean;
}

const inFlightRequests = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes default TTL

function* iterStorageKeys(store: Storage = localStorage) {
  for (let i = 0; i < store.length; i++) {
    const key = store.key(i);
    if (key) yield key;
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
    logger.error('STORAGE', 'Failed to set item in storage', e);
  }
};

const getItem = (
  key: string,
  store: Storage = localStorage,
): CacheWrapper<any> | null => {
  try {
    const str = store.getItem(key);
    if (!str) return null;
    return JSON.parse(str);
  } catch (e) {
    logger.warn('STORAGE', `Failed to parse storage item for key: ${key}`, e);
    return null;
  }
};

const removeItem = (key: string, store: Storage = localStorage) => {
  try {
    store.removeItem(key);
  } catch (e) {
    logger.error('STORAGE', `Failed to remove item for key: ${key}`, e);
  }
};

export const secureStorage = {
  /**
   * Purges all expired TTL cache items on startup.
   */
  purgeExpiredOnStartup: (store: Storage = localStorage) => {
    const keysToRemove: string[] = [];
    try {
      for (const key of iterStorageKeys(store)) {
        if (key && key.startsWith('edu_rag_')) {
          const value = getItem(key, store);
          if (!value) continue;
          if (typeof value.expiresAt === 'number' && Date.now() > value.expiresAt) {
            keysToRemove.push(key);
          }
        }
      }
    } catch (e) {
      logger.warn('STORAGE', 'Startup TTL purge failed', e);
    } finally {
      keysToRemove.forEach((key) => removeItem(key, store));
    }
  },

  /**
   * Clears all cached RAG workspace keys.
   */
  clearCache: (store: Storage = localStorage) => {
    const keysToRemove: string[] = [];
    try {
      for (const key of iterStorageKeys(store)) {
        if (key && key.startsWith('edu_rag_')) {
          keysToRemove.push(key);
        }
      }
    } catch (e) {
      logger.error('STORAGE', 'Failed to clear cache', e);
    } finally {
      keysToRemove.forEach((key) => removeItem(key, store));
    }
  },

  /**
   * Stores data with an absolute expiresAt TTL timestamp and optional lastModified DB timestamp.
   */
  setCachedItemWithTTL: <T>(
    key: string,
    data: T,
    ttlMs: number = DEFAULT_TTL_MS,
    lastModified?: string,
    store: Storage = localStorage,
  ): void => {
    const now = Date.now();
    const effectiveTtl = ttlMs > 0 ? ttlMs : DEFAULT_TTL_MS;
    const wrapper: CacheWrapper<T> = {
      data,
      lastModified,
      cachedAt: now,
      ttlMs: effectiveTtl,
      expiresAt: now + effectiveTtl,
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
    const cache = getItem(key, store);
    if (!cache) return null;
    try {
      if (typeof cache.expiresAt === 'number') {
        if (Date.now() < cache.expiresAt) {
          return cache.data as T;
        } else {
          return null;
        }
      }
      return cache.data as T;
    } catch (e) {
      logger.warn('STORAGE', `Failed to read TTL cache for key: ${key}`, e);
      return null;
    }
  },

  /**
   * Retrieves full details about a cached item, including its data, lastModified,
   * and whether its TTL is expired. Does not delete on expiry so client can use
   * lastModified to revalidate with the server.
   */
  getCachedItemDetails: <T>(
    key: string,
    store: Storage = localStorage,
  ): CachedItemDetails<T> | null => {
    const cache = getItem(key, store);
    if (!cache) return null;
    const now = Date.now();
    const isExpired = typeof cache.expiresAt === 'number' ? now >= cache.expiresAt : false;
    return {
      data: cache.data as T,
      lastModified: cache.lastModified,
      isExpired,
      cachedAt: cache.cachedAt || now,
      ttlMs: cache.ttlMs || DEFAULT_TTL_MS,
      expiresAt: cache.expiresAt || (now + DEFAULT_TTL_MS),
    };
  },

  /**
   * Updates only the TTL (expiresAt) of an existing cached item without modifying its payload data.
   * Called when server revalidation confirms the cached component has not been modified (304).
   */
  touchCachedItemTTL: (
    key: string,
    newTtlMs?: number,
    store: Storage = localStorage,
  ): void => {
    const cache = getItem(key, store);
    if (!cache) return;
    const effectiveTtl = newTtlMs && newTtlMs > 0 ? newTtlMs : (cache.ttlMs || DEFAULT_TTL_MS);
    cache.ttlMs = effectiveTtl;
    cache.expiresAt = Date.now() + effectiveTtl;
    setItem(key, cache, store);
  },

  /**
   * Removes a specific cached item.
   */
  removeCachedItem: (key: string, store: Storage = localStorage): void => {
    removeItem(key, store);
  },

  /**
   * Self-contained read-through cache with conditional revalidation.
   * Requires no supplementary setter function; handles fetch, validation,
   * TTL bumps, persistence, and in-flight promise de-duplication internally.
   *
   * Execution Lifecycle:
   * 1. In-flight de-duplication: coalesces concurrent calls on the same key into a single Promise.
   * 2. Cache hit & unexpired: returns cached data immediately.
   * 3. Cache hit & expired: invokes `validator(cached)`.
   *    - If valid: bumps TTL (touch) and returns cached data (304 Unmodified).
   *    - If invalid: invokes `fetcher()`, updates cache internally, and returns fresh data.
   * 4. Cache miss: invokes `fetcher()`, updates cache internally, and returns fresh data.
   * 5. Offline resilience: returns cached data if available when fetch/validation throws.
   */
  getCache: async <T>(
    key: string,
    options: GetCacheOptions<T>,
    store: Storage = localStorage,
  ): Promise<T> => {
    if (inFlightRequests.has(key)) {
      return inFlightRequests.get(key) as Promise<T>;
    }

    const execute = async (): Promise<T> => {
      const ttl = options.ttlMs ?? DEFAULT_TTL_MS;
      const cached = secureStorage.getCachedItemDetails<T>(key, store);

      if (cached && !options.forceRefresh) {
        if (!cached.isExpired) {
          return cached.data;
        }

        if (options.validator) {
          try {
            const isValid = await options.validator(cached);
            if (isValid) {
              logger.info('STORAGE', `getCache: item ${key} validated as fresh (304), bumping TTL`);
              secureStorage.touchCachedItemTTL(key, ttl, store);
              return cached.data;
            }
          } catch (valErr) {
            logger.warn('STORAGE', `getCache: validation error for key ${key}, falling back to cache`, valErr);
            return cached.data;
          }
        }
      }

      try {
        const fetchResult = await options.fetcher();
        let payloadData: T;
        let lastModified: string | undefined;

        if (
          fetchResult !== null &&
          typeof fetchResult === 'object' &&
          'data' in fetchResult &&
          'lastModified' in fetchResult
        ) {
          const res = fetchResult as FetcherResult<T>;
          payloadData = res.data;
          lastModified = res.lastModified;
        } else {
          payloadData = fetchResult as T;
        }

        secureStorage.setCachedItemWithTTL(
          key,
          payloadData,
          ttl,
          lastModified ?? new Date().toISOString(),
          store,
        );

        return payloadData;
      } catch (fetchErr) {
        if (cached?.data) {
          logger.warn('STORAGE', `getCache: fetcher failed for key ${key}, returning stale cache`, fetchErr);
          return cached.data;
        }
        logger.error('STORAGE', `getCache: fetcher failed for key ${key} with no cached fallback`, fetchErr);
        throw fetchErr;
      }
    };

    const promise = execute().finally(() => {
      inFlightRequests.delete(key);
    });

    inFlightRequests.set(key, promise);
    return promise;
  },
};

export const getCache = secureStorage.getCache;
