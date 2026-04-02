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
const GEMS_CACHE_PREFIX = "vizura_gems_balance:";

export const GemsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [gems, setGems] = useState(0);
  const [loading, setLoading] = useState(true);

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
      setGems(0);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from("credits")
        .select("balance")
        .eq("user_id", user.id)
        .single();
      if (error) {
        console.error("Failed to fetch gems:", error);
        setGems(0);
      } else {
        const balance = data?.balance ?? 0;
        writeCachedGems(user.id, balance);
        setGems(balance);
      }
    } catch (e) {
      console.error("Gems fetch error:", e);
      setGems(0);
    } finally {
      setLoading(false);
    }
  }, [user, writeCachedGems]);

  useEffect(() => {
    if (!user) {
      setGems(0);
      setLoading(false);
      return;
    }

    const cachedGems = readCachedGems(user.id);
    if (cachedGems !== null) {
      setGems(cachedGems);
    }
    setLoading(true);
    fetchGems();
  }, [fetchGems, readCachedGems, user]);

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
