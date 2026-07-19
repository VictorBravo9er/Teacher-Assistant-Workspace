import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import ClassApp from './components/ClassApp';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'auth' | 'app'>('landing');
  const { session, isInitializing } = useAuth();

  // Sync view based on session changes
  useEffect(() => {
    if (session) {
      setCurrentView('app');
    } else if (currentView === 'app') {
      // Only force back to landing if they were in the app and got logged out.
      // We don't want to force them from 'auth' back to 'landing' if they are just typing credentials.
      setCurrentView('landing');
    }
  }, [session, currentView]);

  if (isInitializing) {
    return <div className="h-screen w-screen bg-background flex items-center justify-center"></div>;
  }

  return (
    <>
      {currentView === 'landing' && <LandingPage onNavigate={(view) => setCurrentView(view)} />}
      {currentView === 'auth' && <AuthPage onBack={() => setCurrentView('landing')} />}
      {currentView === 'app' && <ClassApp />}
    </>
  );
}
