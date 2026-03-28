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

export const GemsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [gems, setGems] = useState(0);
  const [loading, setLoading] = useState(true);

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
        setGems(data?.balance ?? 0);
      }
    } catch (e) {
      console.error("Gems fetch error:", e);
      setGems(0);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchGems();
  }, [fetchGems]);

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
