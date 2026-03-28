import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Gem, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const plans = [
  { label: "starter", gems: 150, price: 5, envVar: "TOPUP_150_PRICE_ID" },
  { label: "popular", gems: 600, price: 15, highlighted: true, envVar: "TOPUP_600_PRICE_ID" },
  { label: "pro", gems: 1500, price: 30, envVar: "TOPUP_1500_PRICE_ID" },
];

const TopUps = () => {
  const { gems, refetch } = useGems();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`);
  }, [user, loading, navigate, location.pathname]);

  // Refetch gems when returning from checkout
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("checkout") === "success") {
      refetch();
    }
  }, [location.search, refetch]);

  if (!loading && !user) return null;

  const handleBuy = async (plan: typeof plans[number]) => {
    setBuying(plan.label);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { type: "topup", priceId: plan.envVar },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e: any) {
      toast.error(e.message || "failed to start checkout");
      setBuying(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="w-full max-w-lg mx-auto px-4 pt-12 pb-12">
        <div className="flex items-center gap-3 mb-10">
          <BackButton />
        </div>
        <PageTitle>top-ups</PageTitle>

        <div className="flex items-center gap-2 mb-10">
          <Gem size={20} strokeWidth={2.5} className="text-gem-green" />
          <span className="text-2xl font-extrabold lowercase text-foreground">{gems} gems</span>
        </div>

        <div className="space-y-4">
          {plans.map((plan) => {
            const perGem = (plan.price / plan.gems).toFixed(3);
            return (
              <div
                key={plan.label}
                className={`rounded-2xl p-5 ${
                  plan.highlighted
                    ? "border-[5px] border-neon-yellow bg-foreground"
                    : "border-[5px] border-border bg-card"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`text-xs font-extrabold lowercase ${
                      plan.highlighted ? "text-background" : "text-foreground"
                    }`}
                  >
                    {plan.label}
                  </span>
                  {plan.highlighted && (
                    <span className="text-[10px] font-extrabold lowercase text-neon-yellow-foreground bg-neon-yellow px-2 py-0.5 rounded-full">
                      best value
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2 mb-1">
                  <span
                    className={`text-xl font-extrabold lowercase ${
                      plan.highlighted ? "text-background" : "text-foreground"
                    }`}
                  >
                    {plan.gems.toLocaleString()} gems
                  </span>
                </div>

                <div className="flex items-baseline justify-between mb-4">
                  <span
                    className={`text-2xl font-extrabold lowercase ${
                      plan.highlighted ? "text-background" : "text-foreground"
                    }`}
                  >
                    ${plan.price}
                  </span>
                  <span
                    className={`text-[11px] font-extrabold lowercase ${
                      plan.highlighted ? "text-background/60" : "text-foreground/50"
                    }`}
                  >
                    ${perGem}/gem
                  </span>
                </div>

                <button
                  className={`w-full h-12 rounded-2xl text-sm font-extrabold lowercase transition-all ${
                    plan.highlighted
                      ? "bg-background text-foreground hover:bg-background/90"
                      : "bg-neon-green text-neon-green-foreground hover:opacity-90"
                  }`}
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
