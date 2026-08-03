import React, { useState, useEffect, useCallback } from 'react';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import ClassApp from './components/ClassApp';
import { useAuth } from './contexts/AuthContext';

type ViewMode = 'landing' | 'auth' | 'app';

const getInitialView = (): ViewMode => {
  const path = window.location.pathname;
  if (path.startsWith('/dashboard') || path.startsWith('/app')) return 'app';
  if (path.startsWith('/auth') || path.startsWith('/login') || path.startsWith('/signin')) return 'auth';
  return 'landing';
};

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>(getInitialView);
  const { session, isInitializing } = useAuth();

  const navigateTo = useCallback((view: ViewMode) => {
    let targetPath = '/';
    if (view === 'auth') targetPath = '/auth';
    if (view === 'app') targetPath = '/dashboard';

    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setCurrentView(view);
  }, []);

  // Listen to browser Back / Forward buttons and custom navigation events
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getInitialView());
    };

    const handleCustomNav = (e: Event) => {
      const custom = e as CustomEvent<ViewMode>;
      if (custom.detail) {
        navigateTo(custom.detail);
      }
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('agy-navigate', handleCustomNav);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('agy-navigate', handleCustomNav);
    };
  }, [navigateTo]);

  // Apply system theme by default across all views (LandingPage, AuthPage, ClassApp)
  useEffect(() => {
    const applyGlobalTheme = () => {
      const savedTheme = (localStorage.getItem('edu_rag_theme') as 'system' | 'light' | 'dark') || 'system';
      const root = window.document.documentElement;

      if (savedTheme === 'dark') {
        root.classList.add('dark');
      } else if (savedTheme === 'light') {
        root.classList.remove('dark');
      } else {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        if (systemPrefersDark) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    };

    applyGlobalTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => applyGlobalTheme();
    mediaQuery.addEventListener('change', handleChange);
    window.addEventListener('storage', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
      window.removeEventListener('storage', handleChange);
    };
  }, []);

  // Sync view based on session changes without blocking logged-in users from viewing the landing page
  useEffect(() => {
    if (isInitializing) return;

    if (session) {
      // If user logs in while on auth page, redirect them to dashboard
      if (currentView === 'auth') {
        navigateTo('app');
      }
      // Note: If currentView === 'landing', we let them stay on the landing page!
    } else {
      // If unauthenticated user tries to view dashboard, redirect to auth page
      if (currentView === 'app') {
        navigateTo('auth');
      }
    }
  }, [session, isInitializing, currentView, navigateTo]);

  if (isInitializing) {
    return <div className="h-screen w-screen bg-background flex items-center justify-center"></div>;
  }

  return (
    <>
      {currentView === 'landing' && (
        <LandingPage
          onNavigate={(view) => navigateTo(view)}
          isLoggedIn={!!session}
        />
      )}
      {currentView === 'auth' && <AuthPage onBack={() => navigateTo('landing')} />}
      {currentView === 'app' && <ClassApp />}
    </>
  );
}

