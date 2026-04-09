import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Gem, Loader2, Sparkles, Zap, Crown } from "lucide-react";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import DotDecal from "@/components/DotDecal";

const plans = [
  { label: "15 gems", gems: 15, price: 9, icon: Gem, accent: null },
  { label: "35 gems", gems: 35, price: 20, icon: Zap, accent: "popular" },
  { label: "80 gems", gems: 80, price: 40, icon: Crown, accent: "best value" },
];

const TopUps = () => {
  const { gems, refetch } = useGems();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
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
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      <main className="relative z-[1] w-full max-w-lg md:max-w-3xl mx-auto px-4 md:px-10 pt-10 pb-[140px]">
        <div className="flex items-center gap-3 mb-7">
          <BackButton />
          <PageTitle className="mb-0">top-ups</PageTitle>
        </div>

        {/* Current balance */}
        <div
          className="flex items-center justify-between mb-8 px-5 py-4"
          style={{ backgroundColor: "#111111", borderRadius: 16, border: "2px solid #1a1a1a" }}
        >
          <span className="text-sm font-[900] lowercase text-foreground/50">your balance</span>
          <div className="flex items-center gap-2">
            <Gem size={18} strokeWidth={2.5} style={{ color: "#00e0ff" }} />
            <span className="text-2xl font-[900] lowercase text-white">{gems}</span>
          </div>
        </div>

        {/* Plans */}
        <div className="flex flex-col gap-3 md:grid md:grid-cols-3 md:gap-4">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isPopular = plan.accent === "popular";
            const isBest = plan.accent === "best value";
            const highlight = isPopular || isBest;

            return (
              <div
                key={plan.label}
                className="relative overflow-hidden"
                style={{
                  borderRadius: 16,
                  border: highlight ? "2px solid #facc15" : "2px solid #1a1a1a",
                  backgroundColor: "#111111",
                }}
              >
                {plan.accent && (
                  <div
                    className="flex items-center justify-center py-1.5 text-[10px] font-[900] lowercase tracking-wide"
                    style={{ backgroundColor: "#facc15", color: "#000" }}
                  >
                    {plan.accent}
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-10 h-10 flex items-center justify-center"
                        style={{
                          borderRadius: 12,
                          backgroundColor: highlight ? "rgba(250,204,21,0.1)" : "rgba(255,255,255,0.05)",
                          border: highlight ? "2px solid rgba(250,204,21,0.3)" : "2px solid #222",
                        }}
                      >
                        <Icon size={18} strokeWidth={2.5} style={{ color: highlight ? "#facc15" : "rgba(255,255,255,0.4)" }} />
                      </div>
                      <div>
                        <span className="block text-xl font-[900] lowercase text-white">{plan.gems}</span>
                        <span className="block text-[10px] font-[800] lowercase text-foreground/30">gems</span>
                      </div>
                    </div>
                    <span className="text-2xl font-[900] lowercase text-white">${plan.price}</span>
                  </div>

                  <button
                    className="w-full h-12 text-sm font-[900] lowercase transition-all active:scale-[0.97]"
                    style={{
                      borderRadius: 12,
                      backgroundColor: highlight ? "#facc15" : "rgba(250,204,21,0.08)",
                      color: highlight ? "#000" : "#facc15",
                      border: highlight ? "none" : "2px solid #facc15",
                    }}
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
              </div>
            );
          })}
        </div>

        {/* Info note */}
        <p className="text-[10px] font-[800] lowercase text-foreground/20 text-center mt-6">
          gems never expire · use for photos & characters
        </p>
      </main>
    </div>
  );
};

export default TopUps;
