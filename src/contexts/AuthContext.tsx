import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { clearSpecialAccountCache, syncSpecialAccountCache } from "@/lib/specialAccount";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  autoSignIn: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<ReturnType<typeof supabase.auth.onAuthStateChange>["data"]["subscription"] | null>(null);

  const hydrateUser = useCallback(async (seedUser?: User | null, cancelled = false) => {
    if (!seedUser) {
      if (!cancelled) {
        setUser(null);
        clearSpecialAccountCache();
      }
      return null;
    }

    if (!cancelled) {
      setUser(seedUser);
      syncSpecialAccountCache(seedUser);
    }

    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;

      const freshUser = data.user ?? seedUser;
      if (!cancelled) {
        setUser(freshUser);
        syncSpecialAccountCache(freshUser);
      }
      return freshUser;
    } catch {
      return seedUser;
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (cancelled) return;
        await hydrateUser(data.session?.user ?? null, cancelled);
      } finally {
        if (cancelled) return;
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
          if (event === "SIGNED_OUT" || !session?.user) {
            setUser(null);
            clearSpecialAccountCache();
            return;
          }

          if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
            const nextUser = session?.user ?? null;
            setUser(nextUser);
            syncSpecialAccountCache(nextUser);
            void hydrateUser(nextUser);
          }
        });
        subscriptionRef.current = sub.subscription;
        setLoading(false);
      }
    };

    void initializeAuth();

    return () => {
      cancelled = true;
      subscriptionRef.current?.unsubscribe();
    };
  }, [hydrateUser]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw error;
  };

  const autoSignIn = async () => {
    const id = crypto.randomUUID().slice(0, 8);
    const email = `user-${id}@vizura.app`;
    const password = crypto.randomUUID();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut, resetPassword, autoSignIn }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};