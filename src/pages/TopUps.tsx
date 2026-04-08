import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Gem, Loader2 } from "lucide-react";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/sonner";
import DotDecal from "@/components/DotDecal";

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
      <main className="relative z-[1] w-full max-w-lg md:max-w-3xl mx-auto px-4 md:px-10 pt-1 pb-[250px]">
        <div className="flex items-center gap-3 mb-7">
          <BackButton />
          <PageTitle className="mb-0">top-ups</PageTitle>
        </div>

        <div className="flex items-center gap-2 mb-6">
          <Gem size={20} strokeWidth={2.5} className="text-gem-green" />
          <span className="text-2xl font-extrabold lowercase text-foreground">{gems} gems</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          {plans.map((plan) => (
            <div
              key={plan.label}
              className="rounded-2xl p-4 md:p-5 border-[1.5px] border-[#1a1a1a]"
              style={{ backgroundColor: "#111111" }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Gem size={16} strokeWidth={2.5} className="text-gem-green" />
                  <span className="text-lg md:text-xl font-extrabold lowercase text-foreground">
                    {plan.gems} gems
                  </span>
                </div>
                <span className="text-xl md:text-2xl font-extrabold lowercase text-foreground">
                  ${plan.price}
                </span>
              </div>

              <button
                className="w-full h-11 md:h-12 text-sm md:text-base font-extrabold lowercase transition-all bg-neon-yellow text-neon-yellow-foreground hover:opacity-90"
                style={{ borderRadius: 12 }}
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
          ))}
        </div>
      </main>
    </div>
  );
};

export default TopUps;
