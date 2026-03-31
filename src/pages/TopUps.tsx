import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Gem, Loader2 } from "lucide-react";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";

const plans = [
  { label: "15 gems", gems: 15, price: 9 },
  { label: "35 gems", gems: 35, price: 20 },
  { label: "80 gems", gems: 80, price: 40 },
];

const TopUps = () => {
  const { gems, refetch } = useGems();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate(`/account?redirect=${encodeURIComponent(location.pathname)}`);
  }, [user, loading, navigate, location.pathname]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("checkout") === "success") refetch();
  }, [location.search, refetch]);

  if (!loading && !user) return null;

  const handleBuy = async (plan: typeof plans[number]) => {
    setBuying(plan.label);
    try {
      const { data, error } = await supabase.functions.invoke("add-credits", {
        body: { amount: plan.gems },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await refetch();
      toast.success(`${plan.gems} gems added!`);
    } catch (e: any) {
      toast.error(e.message || "failed to add gems");
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-lg mx-auto px-4 pt-14 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
          <PageTitle className="mb-0">top-ups</PageTitle>
        </div>

        <div className="flex items-center gap-2 mb-10">
          <Gem size={20} strokeWidth={2.5} className="text-gem-green" />
          <span className="text-2xl font-extrabold lowercase text-foreground">{gems} gems</span>
        </div>

        <div className="space-y-4">
          {plans.map((plan) => {
            const perGem = (plan.price / plan.gems).toFixed(2);
            return (
              <div
                key={plan.label}
                className="rounded-2xl p-5 border-[5px] border-border bg-card"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Gem size={16} strokeWidth={2.5} className="text-gem-green" />
                  <span className="text-xl font-extrabold lowercase text-foreground">
                    {plan.gems} gems
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-4">
                  <span className="text-2xl font-extrabold lowercase text-foreground">
                    ${plan.price}
                  </span>
                  <span className="text-[11px] font-extrabold lowercase text-foreground/50">
                    ${perGem}/gem
                  </span>
                </div>

                <button
                  className="w-full h-12 rounded-2xl text-sm font-extrabold lowercase transition-all bg-neon-yellow text-neon-yellow-foreground hover:opacity-90"
                  onClick={() => handleBuy(plan)}
                  disabled={buying !== null}
                >
                  {buying === plan.label ? (
                    <Loader2 className="animate-spin inline" size={18} />
                  ) : (
                    "buy gems"
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default TopUps;
