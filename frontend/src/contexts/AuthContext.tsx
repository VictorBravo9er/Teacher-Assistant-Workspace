import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { secureStorage } from '../lib/storage';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  isInitializing: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // 0. Purge expired TTL cache items on startup
    secureStorage.purgeExpiredOnStartup();

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        secureStorage.initSessionKey();
      }
      setIsInitializing(false);
    });

    // 2. Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        secureStorage.initSessionKey();
      } else {
        secureStorage.clearSessionKey();
      }
      setIsInitializing(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // Clear PII and encryption key from storage
    secureStorage.clearSessionKey();
    await supabase.auth.signOut();
  };


  // Custom global logout listener
  useEffect(() => {
    const handleLogoutEvent = () => signOut();
    window.addEventListener('logout', handleLogoutEvent);
    return () => window.removeEventListener('logout', handleLogoutEvent);
  }, []);

  return (
    <AuthContext.Provider value={{ session, isInitializing, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
