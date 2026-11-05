import React, { useState, useEffect, useCallback, Suspense, lazy } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { supabase } from '@/lib/supabase';

// Lazy-loaded top-level view shells for performance and code splitting
const LandingPage = lazy(() => import('@/views/LandingPage'));
const AuthPage = lazy(() => import('@/views/AuthPage'));
const ClassApp = lazy(() => import('@/views/ClassApp'));
const StudentApp = lazy(() => import('@/views/StudentApp'));

function ViewFallback() {
  return (
    <div className="h-screen w-screen bg-background flex flex-col items-center justify-center gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
    </div>
  );
}

type ViewMode = 'landing' | 'auth' | 'app';

export const isSetPasswordMode = (): boolean => {
  const search = window.location.search;
  const hash = window.location.hash;
  return (
    search.includes('mode=set-password') ||
    hash.includes('type=invite') ||
    hash.includes('type=recovery')
  );
};

const getInitialView = (): ViewMode => {
  if (isSetPasswordMode()) return 'auth';
  const path = window.location.pathname;
  if (path.startsWith('/dashboard') || path.startsWith('/app')) return 'app';
  if (path.startsWith('/auth') || path.startsWith('/login') || path.startsWith('/signin')) return 'auth';
  return 'landing';
};

export default function App() {
  const [currentView, setCurrentView] = useState<ViewMode>(getInitialView);
  const [passwordSetRequired, setPasswordSetRequired] = useState<boolean>(() => isSetPasswordMode());
  const { session, role, isInitializing } = useAuth();
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

  // Handle successful password setting from AuthPage
  const handlePasswordSet = useCallback(() => {
    setPasswordSetRequired(false);
    window.history.replaceState({}, '', '/dashboard');
    setCurrentView('app');
  }, []);

  // Listen to Supabase password recovery events
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setPasswordSetRequired(true);
        setCurrentView('auth');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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
  // and without bypassing required password setup
  useEffect(() => {
    if (isInitializing) return;

    if (session) {
      if (currentView === 'auth') {
        if (!passwordSetRequired && !isSetPasswordMode()) {
          navigateTo('app');
        }
      }
    } else {
      if (currentView === 'app') {
        navigateTo('auth');
      }
    }
  }, [session, isInitializing, currentView, navigateTo, passwordSetRequired]);

  // Prefetch secondary views on idle to make subsequent navigation instantaneous
  useEffect(() => {
    if (currentView === 'landing') {
      const timer = setTimeout(() => {
        import('@/views/AuthPage');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentView]);

  useEffect(() => {
    if (session) {
      if (role === 'student') {
        import('@/views/StudentApp');
      } else {
        import('@/views/ClassApp');
      }
    }
  }, [session, role]);

  if (isInitializing) {
    return <div className="h-screen w-screen bg-background flex items-center justify-center"></div>;
  }

  return (
    <Suspense fallback={<ViewFallback />}>
      {currentView === 'landing' && (
        <LandingPage
          onNavigate={(view) => navigateTo(view)}
          isLoggedIn={!!session}
        />
      )}
      {currentView === 'auth' && (
        <AuthPage
          onBack={() => navigateTo('landing')}
          onPasswordSet={handlePasswordSet}
        />
      )}
      {currentView === 'app' && (role === 'student' ? <StudentApp /> : <ClassApp />)}
    </Suspense>
  );
}
