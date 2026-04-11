import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import DotDecal from "@/components/DotDecal";

const packs = [
  { id: "starter", title: "starter pack", gems: 15, price: 9, tag: null },
  { id: "pro", title: "pro pack", gems: 35, price: 20, tag: "popular" },
  { id: "elite", title: "elite pack", gems: 80, price: 40, tag: "best value" },
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

  const handleBuy = async (pack: typeof packs[number]) => {
    if (buying) return;
    setBuying(pack.id);
    try {
      const { data, error } = await supabase.functions.invoke("add-credits", {
        body: { amount: pack.gems },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await refetch();
      toast.success(`+${pack.gems} gems added`);
    } catch (err: any) {
      toast.error(err.message || "purchase failed");
    } finally {
      setBuying(null);
    }
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      <main className="relative z-[1] w-full max-w-lg mx-auto px-4 pt-10 pb-[280px] flex flex-col items-center">
        <div className="flex items-center gap-3 mb-10 w-full">
          <BackButton />
          <PageTitle className="mb-0">top-ups</PageTitle>
        </div>

        {/* Gem balance */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <span className="text-2xl">💎</span>
          <span className="text-3xl font-[900] text-white">{gems}</span>
          <span className="text-lg font-[800] lowercase text-white/50">gems</span>
        </div>

        {/* Pack cards */}
        <div className="w-full flex flex-col gap-4">
          {packs.map((pack) => (
            <button
              key={pack.id}
              disabled={buying !== null}
              onClick={() => handleBuy(pack)}
              className="relative w-full rounded-[16px] px-5 py-5 flex items-center justify-between transition-all active:scale-[0.97] disabled:opacity-60"
              style={{ backgroundColor: "#1a1a1a" }}
            >
              {pack.tag && (
                <span
                  className="absolute top-3 right-4 text-[10px] font-[900] lowercase px-2 py-0.5 rounded-full bg-neon-yellow text-neon-yellow-foreground"
                >
                  {pack.tag}
                </span>
              )}
              <div className="flex flex-col items-start">
                <span className="text-sm font-[900] lowercase text-white">{pack.title}</span>
                <span className="text-xs font-[700] lowercase text-white/40 mt-1 flex items-center gap-1">
                  💎 {pack.gems} gems
                </span>
              </div>
              <span className="text-2xl font-[900] text-white">${pack.price}</span>
            </button>
          ))}
        </div>
      </main>
    </div>
  );
};

export default TopUps;
