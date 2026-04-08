import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { clearSpecialAccountCache, syncSpecialAccountCache } from "@/lib/specialAccount";
import { getPreviewAccountCredentials } from "@/lib/previewAuth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signInPreview: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const subscriptionRef = useRef<ReturnType<typeof supabase.auth.onAuthStateChange>["data"]["subscription"] | null>(null);
  const oauthResolvedRef = useRef(false);

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

  const resolveOAuthCallback = useCallback(async () => {
    if (typeof window === "undefined" || oauthResolvedRef.current) return;

    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
    const accessToken = hashParams.get("access_token") ?? url.searchParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token") ?? url.searchParams.get("refresh_token");
    const code = url.searchParams.get("code");

    if (!accessToken && !refreshToken && !code) return;

    oauthResolvedRef.current = true;

    if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) {
        oauthResolvedRef.current = false;
        throw error;
      }
    } else if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        oauthResolvedRef.current = false;
        throw error;
      }
    }

    url.searchParams.delete("code");
    url.searchParams.delete("access_token");
    url.searchParams.delete("refresh_token");
    url.hash = "";
    window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const initializeAuth = async () => {
      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        const nextUser = session?.user ?? null;

        if (event === "SIGNED_OUT" || !nextUser) {
          setUser(null);
          clearSpecialAccountCache();
          return;
        }

        if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          setUser(nextUser);
          syncSpecialAccountCache(nextUser);
          void hydrateUser(nextUser);
        }
      });
      subscriptionRef.current = sub.subscription;

      try {
        await resolveOAuthCallback();
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (cancelled) return;
        await hydrateUser(data.session?.user ?? null, cancelled);
      } finally {
        if (cancelled) return;
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

  const signInPreview = async () => {
    const { email, password } = getPreviewAccountCredentials();

    const { data, error } = await supabase.functions.invoke("ensure-test-account", {
      body: { email, password },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) throw signInError;
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

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInPreview, signOut, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};