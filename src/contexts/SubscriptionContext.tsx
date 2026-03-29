import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionContextType {
  status: string | null;
  subscribed: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setStatus(null);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        setStatus(null);
      } else {
        setStatus(data?.status ?? null);
      }
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchSubscription();
  }, [fetchSubscription]);

  useEffect(() => {
    if (!user) return;

    const refreshOnReturn = () => {
      void fetchSubscription();
    };

    window.addEventListener("focus", refreshOnReturn);
    document.addEventListener("visibilitychange", refreshOnReturn);

    const channel = supabase
      .channel(`subscription-status-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "subscriptions",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const nextStatus =
            payload.eventType === "DELETE"
              ? null
              : (payload.new as { status?: string | null } | null)?.status ?? null;
          setStatus(nextStatus);
          setLoading(false);
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
      supabase.removeChannel(channel);
    };
  }, [fetchSubscription, user]);

  const subscribed = status !== null && ACTIVE_STATUSES.has(status);

  return (
    <SubscriptionContext.Provider value={{ status, subscribed, loading, refetch: fetchSubscription }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error("useSubscription must be used within SubscriptionProvider");
  return context;
};
