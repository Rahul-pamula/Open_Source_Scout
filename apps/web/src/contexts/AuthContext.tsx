import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type Session, type User } from '@supabase/supabase-js';
import { supabase, hasSupabaseConfig } from '../services/supabase';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signInWithGithub: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasSupabaseConfig()) {
      setLoading(false);
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGithub = async () => {
    if (!hasSupabaseConfig()) throw new Error("Supabase is not configured.");
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
      },
    });
  };

  const signOut = async () => {
    if (!hasSupabaseConfig()) return;
    await supabase.auth.signOut();
  };

  const value = {
    session,
    user,
    loading,
    signInWithGithub,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
