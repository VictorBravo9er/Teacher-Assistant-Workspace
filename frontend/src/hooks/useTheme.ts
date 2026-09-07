import { useState, useEffect, useCallback } from 'react';

export type ThemeMode = 'system' | 'light' | 'dark';

const THEME_STORAGE_KEY = 'edu_rag_theme';

export function useTheme() {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    return saved || 'system';
  });

  const applyTheme = useCallback((mode: ThemeMode) => {
    const root = window.document.documentElement;
    if (mode === 'dark') {
      root.classList.add('dark');
    } else if (mode === 'light') {
      root.classList.remove('dark');
    } else {
      const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (systemPrefersDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, []);

  const setTheme = useCallback((newTheme: ThemeMode) => {
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    setThemeState(newTheme);
    applyTheme(newTheme);
  }, [applyTheme]);

  useEffect(() => {
    applyTheme(theme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleMediaChange = () => {
      const currentSaved = (localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode) || 'system';
      if (currentSaved === 'system') {
        applyTheme('system');
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === THEME_STORAGE_KEY && e.newValue) {
        const nextTheme = e.newValue as ThemeMode;
        setThemeState(nextTheme);
        applyTheme(nextTheme);
      }
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      mediaQuery.removeEventListener('change', handleMediaChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [theme, applyTheme]);

  return { theme, setTheme };
}
