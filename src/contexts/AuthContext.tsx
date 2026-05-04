import { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { clearSpecialAccountCache, syncSpecialAccountCache } from "@/lib/specialAccount";
import { getPreviewAccountCredentials } from "@/lib/previewAuth";
import { clearCachedOnboardingState, fetchAndCacheOnboardingState } from "@/lib/onboardingState";


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
  const [user, setUser] = useState<User | null>(() => {
    try {
      const cached = localStorage.getItem("facefox_cached_user");
      return cached ? JSON.parse(cached) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(() => {
    try { return !localStorage.getItem("facefox_cached_user"); } catch { return true; }
  });
  const subscriptionRef = useRef<ReturnType<typeof supabase.auth.onAuthStateChange>["data"]["subscription"] | null>(null);
  const oauthResolvedRef = useRef(false);

  const hydrateUser = useCallback(async (seedUser?: User | null, cancelled = false) => {
    if (!seedUser) {
      if (!cancelled) {
        setUser(null);
        clearSpecialAccountCache();
        clearCachedOnboardingState();
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
      void fetchAndCacheOnboardingState(freshUser.id);
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
  // Cache user to localStorage for instant header on reload
  useEffect(() => {
    try {
      if (user) {
        localStorage.setItem("facefox_cached_user", JSON.stringify(user));
      }
    } catch {}
  }, [user, loading]);

  useEffect(() => {
    let cancelled = false;

    const initializeAuth = async () => {
      // Force-logout: bump this number to invalidate all existing sessions
      const FORCE_LOGOUT_VERSION = "2";
      const storedVersion = localStorage.getItem("facefox_logout_version");
      if (storedVersion !== FORCE_LOGOUT_VERSION) {
        localStorage.setItem("facefox_logout_version", FORCE_LOGOUT_VERSION);
        localStorage.removeItem("facefox_cached_user");
        try { await supabase.auth.signOut(); } catch {}
      }

      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        const nextUser = session?.user ?? null;
        if (event === "SIGNED_OUT") {
          setUser(null);
          try { localStorage.removeItem("facefox_cached_user"); } catch {}
          clearSpecialAccountCache();
          clearCachedOnboardingState();
          return;
        }

        if (!nextUser && event !== "TOKEN_REFRESHED") {
          setUser(null);
          clearSpecialAccountCache();
          clearCachedOnboardingState();
          return;
        }
        if (!nextUser) return;

        if (event === "INITIAL_SESSION" || event === "SIGNED_IN" || event === "TOKEN_REFRESHED" || event === "USER_UPDATED") {
          // Login-only Google flow: if this OAuth round-trip was started from the
          // "sign in" button, the account MUST already have a Facefox profile.
          // If not, immediately sign back out and bounce to the hero with a toast.
          if (event === "SIGNED_IN" && typeof window !== "undefined" &&
              sessionStorage.getItem("facefox_login_only") === "1") {
            sessionStorage.removeItem("facefox_login_only");
            void (async () => {
              try {
                const { data: profileRow } = await supabase
                  .from("profiles")
                  .select("user_id")
                  .eq("user_id", nextUser.id)
                  .maybeSingle();
                if (!profileRow) {
                  try {
                    sessionStorage.removeItem("facefox_post_auth_home");
                    sessionStorage.removeItem("facefox_signup_gate_active");
                    sessionStorage.removeItem("facefox_guided_flow_state");
                    sessionStorage.removeItem("facefox_resume_after_auth");
                  } catch {}
                  await supabase.auth.signOut();
                  setUser(null);
                  clearSpecialAccountCache();
                  clearCachedOnboardingState();
                  if (typeof window !== "undefined") {
                    const { toast } = await import("@/components/ui/sonner");
                    toast("press start instead!");
                    if (window.location.pathname !== "/") {
                      window.location.replace("/");
                    }
                  }
                  return;
                }
              } catch (lookupErr) {
                console.warn("login-only profile check failed:", lookupErr);
              }
              setUser(nextUser);
              syncSpecialAccountCache(nextUser);
              void fetchAndCacheOnboardingState(nextUser.id);
              void hydrateUser(nextUser);
            })();
            return;
          }

          if (event === "SIGNED_IN" && typeof window !== "undefined" &&
              sessionStorage.getItem("facefox_signup_only") === "1") {
            sessionStorage.removeItem("facefox_signup_only");
            void (async () => {
              try {
                const { data: profileRow } = await supabase
                  .from("profiles")
                  .select("user_id, onboarding_complete")
                  .eq("user_id", nextUser.id)
                  .maybeSingle();
                if (profileRow && profileRow.onboarding_complete) {
                  try {
                    sessionStorage.removeItem("facefox_post_auth_home");
                    sessionStorage.removeItem("facefox_signup_gate_active");
                    sessionStorage.removeItem("facefox_guided_flow_state");
                    sessionStorage.removeItem("facefox_resume_after_auth");
                  } catch {}
                  await supabase.auth.signOut();
                  setUser(null);
                  clearSpecialAccountCache();
                  clearCachedOnboardingState();
                  if (typeof window !== "undefined") {
                    const { toast } = await import("@/components/ui/sonner");
                    toast("press login instead!");
                    if (window.location.pathname !== "/") {
                      window.location.replace("/");
                    }
                  }
                  return;
                }
              } catch (lookupErr) {
                console.warn("signup-only profile check failed:", lookupErr);
              }
              setUser(nextUser);
              syncSpecialAccountCache(nextUser);
              void fetchAndCacheOnboardingState(nextUser.id);
              void hydrateUser(nextUser);
            })();
            return;
          }

          setUser(nextUser);
          syncSpecialAccountCache(nextUser);
          void fetchAndCacheOnboardingState(nextUser.id);
          void hydrateUser(nextUser);
        }
      });
      subscriptionRef.current = sub.subscription;

      try {
        await resolveOAuthCallback();
        // Hard 6s timeout: if Supabase's session restore stalls (e.g. flaky network on
        // a full refresh), don't keep the user trapped behind the yellow loader forever.
        // Race getSession() against a timeout and fall through to setLoading(false) either way.
        const sessionPromise = supabase.auth.getSession();
        const timeoutPromise = new Promise<{ data: { session: null }; error: null }>((resolve) =>
          setTimeout(() => resolve({ data: { session: null }, error: null }), 6000),
        );
        const { data, error } = (await Promise.race([sessionPromise, timeoutPromise])) as Awaited<typeof sessionPromise>;
        if (error) throw error;
        if (cancelled) return;
        await hydrateUser(data.session?.user ?? null, cancelled);
      } catch (err) {
        console.error("Auth init failed:", err);
      } finally {
        if (!cancelled) setLoading(false);
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
    // Clear cached state immediately to prevent stale UI flashes
    try {
      // Clear all facefox session data
      const keysToRemove = Object.keys(sessionStorage).filter(k => k.startsWith("facefox_"));
      keysToRemove.forEach(k => sessionStorage.removeItem(k));
    } catch {}
    localStorage.removeItem("facefox_visited_character");
    localStorage.removeItem("facefox_pending_creation");
    localStorage.removeItem("facefox_draft_backup");
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