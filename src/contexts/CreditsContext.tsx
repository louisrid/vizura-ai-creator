import { createContext, useContext, useState, ReactNode, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";


interface GemsContextType {
  gems: number;
  credits: number; // backward compat alias
  loading: boolean;
  refetch: () => Promise<void>;
}

const GemsContext = createContext<GemsContextType | undefined>(undefined);
const GEMS_CACHE_PREFIX = "facefox_gems_balance:";

export const GemsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [rawGems, setRawGems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasClaimedFreeGems, setHasClaimedFreeGems] = useState(false);

  const getCacheKey = useCallback((userId: string) => `${GEMS_CACHE_PREFIX}${userId}`, []);

  const readCachedGems = useCallback((userId: string) => {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(getCacheKey(userId));
    if (raw === null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [getCacheKey]);

  const writeCachedGems = useCallback((userId: string, value: number | null) => {
    if (typeof window === "undefined") return;
    const key = getCacheKey(userId);
    if (typeof value === "number") {
      window.sessionStorage.setItem(key, String(value));
      return;
    }
    window.sessionStorage.removeItem(key);
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
        setRawGems(0);
      } else {
        const balance = creditsRes.data?.balance ?? 0;
        writeCachedGems(user.id, balance);
        setRawGems(balance);
      }

      setHasClaimedFreeGems(!!profileRes.data?.has_claimed_free_gems);
    } catch (e) {
      console.error("Gems fetch error:", e);
      setRawGems(0);
    } finally {
      setLoading(false);
    }
  }, [user, writeCachedGems]);

  useEffect(() => {
    if (!user) {
      setRawGems(0);
      setHasClaimedFreeGems(false);
      setLoading(false);
      return;
    }

    const cachedGems = readCachedGems(user.id);
    if (cachedGems !== null) {
      setRawGems(cachedGems);
    }
    setLoading(true);
    fetchGems();
  }, [fetchGems, readCachedGems, user]);

  // Always mask gems to 0 until user has claimed free OR made a paid purchase.
  // has_claimed_free_gems is flipped to true on free claim AND on first paid purchase.
  const shouldMask = loading || !hasClaimedFreeGems;
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
