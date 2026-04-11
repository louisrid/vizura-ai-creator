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
  { id: "starter", name: "starter", gems: 15, price: 9, badge: null },
  { id: "pro", name: "pro", gems: 35, price: 20, badge: "15% off!" },
  { id: "elite", name: "elite", gems: 80, price: 40, badge: "20% off!" },
] as const;



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
      <main className="relative z-[1] w-full max-w-lg mx-auto px-4 pt-10 pb-[120px]">
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
                border: "2px solid rgba(255,255,255,0.15)",
                minHeight: 170,
              }}
            >
              {/* Left side */}
              <div className="flex-1 flex flex-col relative z-[1]">
                <div>
                  <span className="block text-[32px] leading-[0.95] font-[900] lowercase text-white">{pack.name}</span>
                  <span className="inline-flex items-center gap-1.5 text-[32px] leading-[0.95] font-[900] lowercase text-white">
                    pack <Gem size={20} strokeWidth={2.5} style={{ color: "#00e0ff" }} />
                  </span>
                </div>

                {pack.badge && (
                  <div className="mt-2">
                    <span className="inline-block rounded-[14px] px-3 py-1 text-[10px] font-[900] lowercase bg-neon-yellow text-neon-yellow-foreground">
                      {pack.badge}
                    </span>
                  </div>
                )}

                <div className="mt-auto pt-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-[14px] px-3.5 py-1.5 text-[13px] font-[900] lowercase text-white"
                    style={{ backgroundColor: "#050a10", border: "2px solid #00e0ff" }}
                  >
                    <Gem size={13} strokeWidth={2.5} style={{ color: "#00e0ff" }} />
                    {pack.gems} gems
                  </span>
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
                  className="rounded-[14px] px-5 py-3 bg-neon-yellow text-neon-yellow-foreground flex items-center justify-center"
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
