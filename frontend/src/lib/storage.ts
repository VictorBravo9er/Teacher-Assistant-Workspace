import CryptoJS from 'crypto-js';

const ENC_KEY_STORAGE_KEY = "_agy_enc_key";
export const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes default TTL for data items
export const KEY_TTL_MS = 30 * 60 * 1000; // 30 minutes sliding TTL for encryption key
export const KEY_TTL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes throttle interval for saving sliding TTL updates

interface CacheWrapper<T> {
  data: T;
  expiresAt: number;
}

interface SessionKeyWrapper {
  key: string;
  expiresAt: number;
}

const getEncryptionKey = (): string => {
  try {
    const raw = localStorage.getItem(ENC_KEY_STORAGE_KEY);
    if (raw) {
      const parsed: SessionKeyWrapper = JSON.parse(raw);
      if (
        parsed &&
        typeof parsed.key === "string" &&
        typeof parsed.expiresAt === "number"
      ) {
        const remainingMs = parsed.expiresAt - Date.now();
        if (remainingMs > 0) {
          // if time remaining is more than 5. donot slide ttl window.
          if (remainingMs > KEY_TTL_TIMEOUT_MS) {
            return parsed.key;
          }
          // if remaining time < 5 minutes, slide ttl window
          parsed.expiresAt = Date.now() + KEY_TTL_MS;
          try {
            localStorage.setItem(ENC_KEY_STORAGE_KEY, JSON.stringify(parsed));
          } catch (e) {
            // Ignore error if storage is temporarily full/blocked
          }
          return parsed.key;
        } else {
          // Key has expired! Clear old key and cached data
          secureStorage.clearSessionKey();
        }
      }
    }
  } catch (e) {
    secureStorage.clearSessionKey();
  }

  // Mission-critical fallback: call initSessionKey() so getEncryptionKey() ALWAYS returns a valid encryption key
  return secureStorage.initSessionKey();
};

export const secureStorage = {
  /**
   * Option 3 (with sliding TTL): Creates a random encryption key in localStorage with an expiration TTL during login.
   * Mission-critical: Always returns a valid hex key string and never throws an exception.
   */
  initSessionKey: (): string => {
    try {
      const existing = localStorage.getItem(ENC_KEY_STORAGE_KEY);
      if (existing) {
        try {
          const parsed: SessionKeyWrapper = JSON.parse(existing);
          if (
            parsed &&
            typeof parsed.key === "string" &&
            typeof parsed.expiresAt === "number" &&
            Date.now() <= parsed.expiresAt
          ) {
            return parsed.key;
          }
        } catch (e) {
          // Ignore parse error and proceed to generate a new key
        }
      }
    } catch (e) {
      // Ignore storage read error
    }

    const randomKey = CryptoJS.lib.WordArray.random(32).toString(
      CryptoJS.enc.Hex,
    );
    const wrapper: SessionKeyWrapper = {
      key: randomKey,
      expiresAt: Date.now() + KEY_TTL_MS,
    };
    try {
      localStorage.setItem(ENC_KEY_STORAGE_KEY, JSON.stringify(wrapper));
    } catch (e) {
      console.warn(
        "Unable to persist session encryption key to localStorage",
        e,
      );
    }
    return randomKey;
  },

  /**
   * Option 3: Clears the random encryption key and cached data during logout or upon TTL expiration.
   */
  clearSessionKey: () => {
    try {
      localStorage.removeItem(ENC_KEY_STORAGE_KEY);
      // Clean up cached RAG workspace keys
      localStorage.removeItem("edu_rag_classes");
      localStorage.removeItem("edu_rag_templates");
      localStorage.removeItem("edu_rag_active_ws");
    } catch (e) {
      console.error("Failed to clear session encryption key", e);
    }
  },

  /**
   * Purges all expired TTL cache items on tab/page startup.
   */
  purgeExpiredOnStartup: () => {
    try {
      const encKey = getEncryptionKey();
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("edu_rag_")) {
          const rawValue = localStorage.getItem(key);
          if (!rawValue) continue;
          try {
            const decryptedBytes = CryptoJS.AES.decrypt(rawValue, encKey);
            const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
            if (decryptedString) {
              const parsed: CacheWrapper<any> = JSON.parse(decryptedString);
              if (parsed && typeof parsed.expiresAt === "number") {
                if (Date.now() > parsed.expiresAt) {
                  keysToRemove.push(key);
                }
              }
            }
          } catch (e) {
            // Ignore non-wrapper items
          }
        }
      }
      keysToRemove.forEach((key) => localStorage.removeItem(key));
    } catch (e) {
      console.warn("Startup TTL purge failed:", e);
    }
  },

  setItem: (key: string, value: string) => {
    try {
      const encKey = getEncryptionKey();
      const encryptedValue = CryptoJS.AES.encrypt(value, encKey).toString();
      localStorage.setItem(key, encryptedValue);
    } catch (e) {
      console.error("Encryption failed for localStorage", e);
    }
  },

  getItem: (key: string): string | null => {
    try {
      const value = localStorage.getItem(key);
      if (!value) return null;

      const encKey = getEncryptionKey();
      const decryptedBytes = CryptoJS.AES.decrypt(value, encKey);
      const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
      if (!decryptedString) {
        return null;
      }
      return decryptedString;
    } catch (e) {
      return null;
    }
  },

  removeItem: (key: string) => {
    try {
      localStorage.removeItem(key);
    } catch (e) {}
  },

  /**
   * Stores data securely with an absolute expiresAt TTL timestamp.
   * Useful for caching database responses so frequent context switches don't hit the DB.
   */
  setCachedItemWithTTL: <T>(
    key: string,
    data: T,
    ttlMs: number = DEFAULT_TTL_MS,
  ): void => {
    const wrapper: CacheWrapper<T> = {
      data,
      expiresAt: Date.now() + ttlMs,
    };
    secureStorage.setItem(key, JSON.stringify(wrapper));
  },

  /**
   * Retrieves cached data if it exists and has not expired according to its expiresAt TTL.
   * Returns null if missing, invalid, or expired.
   */
  getCachedItemWithTTL: <T>(key: string): T | null => {
    const cachedString = secureStorage.getItem(key);
    if (!cachedString) return null;
    try {
      const parsed: CacheWrapper<T> = JSON.parse(cachedString);
      if (parsed && typeof parsed.expiresAt === "number") {
        const isExpired = Date.now() > parsed.expiresAt;
        if (!isExpired) {
          return parsed.data;
        } else {
          secureStorage.removeItem(key);
        }
      }
    } catch (e) {
      console.warn(`Failed to parse TTL cache for key: ${key}`, e);
    }
    return null;
  },
};
