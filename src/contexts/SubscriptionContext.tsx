import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";
import { useAuth } from "./AuthContext";

interface SubscriptionContextType {
  plan: string | null; // "starter" | "pro" | null
  subscribed: boolean;
  loading: boolean;
  subscribe: (planName: string, credits: number) => void;
  cancel: () => void;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

export const SubscriptionProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setPlan(null);
      setLoading(false);
      return;
    }
    // Mock: check localStorage for fake subscription
    const stored = localStorage.getItem(`sub_${user.id}`);
    setPlan(stored || null);
    setLoading(false);
  }, [user]);

  const subscribe = useCallback((planName: string, _credits: number) => {
    if (!user) return;
    localStorage.setItem(`sub_${user.id}`, planName);
    setPlan(planName);
  }, [user]);

  const cancel = useCallback(() => {
    if (!user) return;
    localStorage.removeItem(`sub_${user.id}`);
    setPlan(null);
  }, [user]);

  return (
    <SubscriptionContext.Provider value={{ plan, subscribed: !!plan, loading, subscribe, cancel }}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (!context) throw new Error("useSubscription must be used within SubscriptionProvider");
  return context;
};
