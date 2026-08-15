import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { secureStorage } from '../lib/storage';
import { Session } from '@supabase/supabase-js';

interface AuthContextType {
  session: Session | null;
  role: 'teacher' | 'student' | null;
  isInitializing: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<'teacher' | 'student' | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    // 0. Purge expired TTL cache items on startup
    secureStorage.purgeExpiredOnStartup();

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setRole(session?.user?.user_metadata?.role || null);
      setIsInitializing(false);
    });

    // 2. Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setRole(session?.user?.user_metadata?.role || null);
      if (!session) {
        secureStorage.clearCache();
      }
      setIsInitializing(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    // Clear cached items from storage
    secureStorage.clearCache();
    await supabase.auth.signOut();
  };


  // Custom global logout listener
  useEffect(() => {
    const handleLogoutEvent = () => signOut();
    window.addEventListener('logout', handleLogoutEvent);
    return () => window.removeEventListener('logout', handleLogoutEvent);
  }, []);

  return (
    <AuthContext.Provider value={{ session, role, isInitializing, signOut }}>
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
