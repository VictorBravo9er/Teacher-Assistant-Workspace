import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { secureStorage } from '@/lib/storage';
import { Session, User } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  role: 'teacher' | 'student' | null;
  isInitializing: boolean;
  signOut: () => Promise<void>;
  updateUserMetadata: (metadata: Record<string, any>) => Promise<void>;
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
      const resolvedRole = session?.user?.user_metadata?.role || null;
      logger.info('AUTH', 'Initial session restored', {
        userId: session?.user?.id,
        role: resolvedRole,
      });
      setSession(session);
      setRole(resolvedRole);
      setIsInitializing(false);
    });

    // 2. Listen for auth changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const resolvedRole = session?.user?.user_metadata?.role || null;
      logger.info('AUTH', `Auth state changed: ${_event}`, {
        userId: session?.user?.id,
        role: resolvedRole,
      });
      setSession(session);
      setRole(resolvedRole);
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
    logger.info('AUTH', 'User sign out initiated');
    // Clear cached items from storage
    secureStorage.clearCache();
    await supabase.auth.signOut();
  };

  const updateUserMetadata = async (data: Record<string, any>) => {
    return logger.measure('AUTH', 'updateUserMetadata', async () => {
      const { data: updateData, error } = await supabase.auth.updateUser({ data });
      if (error) {
        logger.error('AUTH', 'Failed to update user metadata', error);
        throw error;
      }
      if (updateData.user) {
        setSession((prev) => (prev ? { ...prev, user: updateData.user } : prev));
        const resolvedRole = updateData.user.user_metadata?.role || null;
        if (resolvedRole) setRole(resolvedRole);
      }
    });
  };

  // Custom global logout listener
  useEffect(() => {
    const handleLogoutEvent = () => signOut();
    window.addEventListener('logout', handleLogoutEvent);
    return () => window.removeEventListener('logout', handleLogoutEvent);
  }, []);

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, role, isInitializing, signOut, updateUserMetadata }}>
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
