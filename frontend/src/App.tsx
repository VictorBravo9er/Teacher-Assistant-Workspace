import React, { useState, useEffect, useCallback } from 'react';
import LandingPage from '@/views/LandingPage';
import AuthPage from '@/views/AuthPage';
import ClassApp from '@/views/ClassApp';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';

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
  // Initializes global theme listener and synchronization
  useTheme();

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

  // Sync view based on session changes without blocking logged-in users from viewing the landing page
  useEffect(() => {
    if (isInitializing) return;

    if (session) {
      if (currentView === 'auth') {
        navigateTo('app');
      }
    } else {
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
