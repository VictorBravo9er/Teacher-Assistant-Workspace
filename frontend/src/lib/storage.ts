import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_STORAGE_SECRET || 'fallback_secret_key_change_in_prod';

export const secureStorage = {
  setItem: (key: string, value: string) => {
    try {
      const encryptedValue = CryptoJS.AES.encrypt(value, SECRET_KEY).toString();
      localStorage.setItem(key, encryptedValue);
    } catch (e) {
      console.error('Encryption failed for localStorage', e);
      // Fallback or handle error
      localStorage.setItem(key, value); 
    }
  },

  getItem: (key: string): string | null => {
    const value = localStorage.getItem(key);
    if (!value) return null;
    
    try {
      const decryptedBytes = CryptoJS.AES.decrypt(value, SECRET_KEY);
      const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
      // If it doesn't decrypt properly (e.g. key change or old unencrypted data), return original
      if (!decryptedString) {
          // It might be old plain JSON data, so we can return it
          return value;
      }
      return decryptedString;
    } catch (e) {
      // It's likely unencrypted old data. Just return it.
      return value;
    }
  },
  
  removeItem: (key: string) => {
      localStorage.removeItem(key);
  }
};
