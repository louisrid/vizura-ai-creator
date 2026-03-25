import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { useAuth } from "./AuthContext";

interface CreditsContextType {
  credits: number;
  loading: boolean;
  refetch: () => Promise<void>;
}

const CreditsContext = createContext<CreditsContextType | undefined>(undefined);

export const CreditsProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [credits, setCredits] = useState(0);

  useEffect(() => {
    setCredits(user ? 100 : 0);
  }, [user]);

  const refetch = async () => {
    setCredits(user ? 100 : 0);
  };

  return (
    <CreditsContext.Provider value={{ credits, loading: false, refetch }}>
      {children}
    </CreditsContext.Provider>
  );
};

export const useCredits = () => {
  const context = useContext(CreditsContext);
  if (!context) throw new Error("useCredits must be used within CreditsProvider");
  return context;
};
