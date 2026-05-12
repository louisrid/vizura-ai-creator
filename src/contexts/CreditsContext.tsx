import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { readCachedOnboardingState } from "@/lib/onboardingState";


interface GemsContextType {
  gems: number;
  credits: number; // backward compat alias
  loading: boolean;
  refetch: () => Promise<void>;
}

const GemsContext = createContext<GemsContextType | undefined>(undefined);
const GEMS_CACHE_PREFIX = "facefox_gems_balance:";
const CLAIMED_CACHE_PREFIX = "facefox_gems_claimed:";

export const GemsProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();
  const [rawGems, setRawGems] = useState(() => {
    if (typeof window === "undefined") return 0;
    const rawUser = localStorage.getItem("facefox_cached_user");
    const userId = rawUser ? (() => { try { return JSON.parse(rawUser)?.id; } catch { return null; } })() : localStorage.getItem("facefox_cached_user_id");
    if (!userId) return 0;
    const cached = localStorage.getItem("facefox_gems_balance:" + userId);
    return cached !== null ? Number(cached) : 0;
  });
  const [loading, setLoading] = useState(true);
  const [hasClaimedFreeGems, setHasClaimedFreeGems] = useState(() => {
    if (typeof window === "undefined") return false;
    const rawUser = localStorage.getItem("facefox_cached_user");
    const userId = rawUser ? (() => { try { return JSON.parse(rawUser)?.id; } catch { return null; } })() : localStorage.getItem("facefox_cached_user_id");
    return userId ? localStorage.getItem("facefox_gems_claimed:" + userId) === "1" : false;
  });
  // Track onboarding completion sync from cache so the gem mask doesn't lag a network roundtrip.
  // Default true so completed users never see a 0 flash on mount before profile fetch returns.
  const [onboardingComplete, setOnboardingComplete] = useState(() => {
    if (typeof window === "undefined") return true;
    const rawUser = localStorage.getItem("facefox_cached_user");
    const userId = rawUser ? (() => { try { return JSON.parse(rawUser)?.id; } catch { return null; } })() : localStorage.getItem("facefox_cached_user_id");
    const cached = userId ? readCachedOnboardingState(userId) : null;
    return cached?.onboardingComplete ?? true;
  });

  const getCacheKey = useCallback((userId: string) => `${GEMS_CACHE_PREFIX}${userId}`, []);

  const readCachedGems = useCallback((userId: string) => {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(getCacheKey(userId));
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [getCacheKey]);

  const writeCachedGems = useCallback((userId: string, value: number | null) => {
    if (typeof window === "undefined") return;
    const key = getCacheKey(userId);
    if (typeof value === "number") {
      window.localStorage.setItem(key, String(value));
      return;
    }
    window.localStorage.removeItem(key);
  }, [getCacheKey]);

  const fetchGems = useCallback(async () => {
    if (!user) {
      setRawGems(0);
      setHasClaimedFreeGems(false);
      setLoading(false);
      return;
    }
    try {
      // Fetch credits and profile in parallel
      const [creditsRes, profileRes] = await Promise.all([
        supabase.from("credits").select("balance").eq("user_id", user.id).single(),
        supabase.from("profiles").select("has_claimed_free_gems, onboarding_complete").eq("user_id", user.id).single(),
      ]);

      if (creditsRes.error) {
        console.error("Failed to fetch gems:", creditsRes.error);
      } else {
        const balance = creditsRes.data?.balance ?? 0;
        writeCachedGems(user.id, balance);
        setRawGems(balance);
      }

      const claimed = !!profileRes.data?.has_claimed_free_gems;
      setHasClaimedFreeGems(claimed);
      if (claimed && typeof window !== "undefined") {
        window.localStorage.setItem(`${CLAIMED_CACHE_PREFIX}${user.id}`, "1");
      }
      const onbComplete = !!profileRes.data?.onboarding_complete;
      setOnboardingComplete(onbComplete);
    } catch (e) {
      console.error("Gems fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [user, writeCachedGems]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setRawGems(0);
      setHasClaimedFreeGems(false);
      setLoading(false);
      return;
    }

    const cachedGems = readCachedGems(user.id);
    const cachedClaimed = typeof window !== "undefined"
      && window.localStorage.getItem(`${CLAIMED_CACHE_PREFIX}${user.id}`) === "1";
    if (cachedGems !== null) {
      setRawGems(cachedGems);
    }
    if (cachedClaimed) {
      setHasClaimedFreeGems(true);
    }
    setLoading(true);
    fetchGems();
  }, [authLoading, fetchGems, readCachedGems, user]);

  // Mask gems to 0 ONLY during onboarding AND before the user has claimed free gems.
  // New users get hidden onboarding credits used for regenerations during the creation
  // flow — those must never be exposed. After they claim 5 free gems OR complete onboarding
  // (taps "create photo" the first time, which resets balance to 0 in the DB), show the
  // real balance. Completed users never see a 0 flash because `onboardingComplete` defaults
  // to `true` and is hydrated synchronously from localStorage.
  const shouldMask = !onboardingComplete && !hasClaimedFreeGems;
  const gems = shouldMask ? 0 : rawGems;

  return (
    <GemsContext.Provider value={{ gems, credits: gems, loading, refetch: fetchGems }}>
      {children}
    </GemsContext.Provider>
  );
};

export const useGems = () => {
  const context = useContext(GemsContext);
  if (!context) throw new Error("useGems must be used within GemsProvider");
  return context;
};

// Backward compatibility
export const CreditsProvider = GemsProvider;
export const useCredits = useGems;
