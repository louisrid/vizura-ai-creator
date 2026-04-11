import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Gem, ShoppingCart } from "lucide-react";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import DotDecal from "@/components/DotDecal";

const packs = [
  { id: "starter", title: "starter pack", gems: 15, price: 9, badge: null, subtitle: "recommended for beginners" },
  { id: "pro", title: "pro pack", gems: 35, price: 20, badge: "15% off!", subtitle: null },
  { id: "elite", title: "elite pack", gems: 80, price: 40, badge: "20% off!", subtitle: null },
] as const;

const gridPatternSvg = `url("data:image/svg+xml,%3Csvg width='16' height='16' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M-4 4l8-8M0 16L16 0M12 20l8-8' stroke='%23ffffff' stroke-opacity='0.035' stroke-width='0.5'/%3E%3C/svg%3E")`;

const TopUps = () => {
  const { refetch } = useGems();
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
      <main className="relative z-[1] w-full max-w-lg mx-auto px-4 pt-10 pb-[280px]">
        <div className="flex items-center gap-3 mb-8 w-full">
          <BackButton />
          <PageTitle className="mb-0">top-ups</PageTitle>
        </div>

        <div className="flex flex-col gap-5">
          {packs.map((pack) => (
            <div
              key={pack.id}
              className="relative rounded-[16px] overflow-hidden p-5 flex gap-4"
              style={{
                backgroundColor: "#000",
                backgroundImage: gridPatternSvg,
                backgroundSize: "20px 20px",
                minHeight: 160,
              }}
            >
              {/* Left side */}
              <div className="flex-1 flex flex-col justify-between relative z-[1]">
                <span className="text-xl font-[900] lowercase text-white">{pack.title}</span>

                <div className="mt-3">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-[900] lowercase text-black"
                    style={{ backgroundColor: "#00e0ff" }}
                  >
                    <Gem size={14} strokeWidth={2.5} className="text-black" />
                    {pack.gems} gems
                  </span>
                </div>

                <div className="mt-3">
                  {pack.subtitle && (
                    <span className="text-[11px] font-[700] lowercase text-white/35">{pack.subtitle}</span>
                  )}
                  {pack.badge && (
                    <span className="inline-block rounded-full px-3 py-1 text-[10px] font-[900] lowercase bg-neon-yellow text-neon-yellow-foreground">
                      {pack.badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Right side — price + buy */}
              <button
                disabled={buying !== null}
                onClick={() => handleBuy(pack)}
                className="relative z-[1] flex flex-col items-center justify-center gap-3 min-w-[90px] disabled:opacity-60 transition-all active:scale-95"
              >
                <span className="text-3xl font-[900] text-white">${pack.price}</span>
                <span
                  className="rounded-[12px] px-5 py-3 bg-neon-yellow text-neon-yellow-foreground flex items-center justify-center"
                >
                  <ShoppingCart size={22} strokeWidth={3} />
                </span>
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default TopUps;
