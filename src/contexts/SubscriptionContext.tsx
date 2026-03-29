import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionContextType {
  status: string | null;
  subscribed: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
  optimisticSubscribe: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const ACTIVE_STATUSES = new Set(["active", "trialing"]);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimistic, setOptimistic] = useState(false);

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
        // Don't overwrite optimistic state
        if (!optimistic) setStatus(null);
      } else {
        const serverStatus = data?.status ?? null;
        // Only overwrite optimistic if server confirms active
        if (optimistic && serverStatus && ACTIVE_STATUSES.has(serverStatus)) {
          setStatus(serverStatus);
        } else if (!optimistic) {
          setStatus(serverStatus);
        }
      }
    } catch {
      if (!optimistic) setStatus(null);
    } finally {
      setLoading(false);
    }
  }, [user, optimistic]);

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
          if (nextStatus && ACTIVE_STATUSES.has(nextStatus)) {
            setStatus(nextStatus);
          } else if (!optimistic) {
            setStatus(nextStatus);
          }
          setLoading(false);
        },
      )
      .subscribe();

    return () => {
      window.removeEventListener("focus", refreshOnReturn);
      document.removeEventListener("visibilitychange", refreshOnReturn);
      supabase.removeChannel(channel);
    };
  }, [fetchSubscription, user, optimistic]);

  const subscribed = status !== null && ACTIVE_STATUSES.has(status);

  const optimisticSubscribe = useCallback(() => {
    setStatus("active");
    setOptimistic(true);
  }, []);

  return (
    <SubscriptionContext.Provider value={{ status, subscribed, loading, refetch: fetchSubscription, optimisticSubscribe }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error("useSubscription must be used within SubscriptionProvider");
  return context;
};
