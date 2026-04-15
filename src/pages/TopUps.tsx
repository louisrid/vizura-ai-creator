import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import { Gem, ShoppingCart, Gift, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import { useGems } from "@/contexts/CreditsContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import DotDecal from "@/components/DotDecal";
import LoadingScreen from "@/components/LoadingScreen";

const packs = [
  { id: "standard", name: "standard", gems: 120, price: 12, badge: null },
  { id: "plus", name: "plus", gems: 300, price: 25, badge: "17% off!" },
  { id: "elite", name: "elite", gems: 600, price: 40, badge: "33% off!" },
] as const;

const TopUps = () => {
  const { refetch } = useGems();
  const { user, loading } = useAuth();
  const navigate = useTransitionNavigate();
  const location = useLocation();
  const [buying, setBuying] = useState<string | null>(null);
  const [canClaimFree, setCanClaimFree] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimChecked, setClaimChecked] = useState(false);

  useEffect(() => {
    if (!loading && !user) navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
  }, [user, loading, navigate, location.pathname]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("checkout") === "success") refetch();
  }, [location.search, refetch]);

  // Check if user can claim free gems
  useEffect(() => {
    if (!user) return;
    const check = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("has_claimed_free_gems")
        .eq("user_id", user.id)
        .single();
      setCanClaimFree(data ? !data.has_claimed_free_gems : false);
      setClaimChecked(true);
    };
    check();

    // Re-check after test account reset
    const onReset = () => { check(); };
    window.addEventListener("facefox:test-reset-complete", onReset);
    return () => window.removeEventListener("facefox:test-reset-complete", onReset);
  }, [user]);

  if (!loading && !user) return null;
  if (user && !claimChecked) return <div className="min-h-screen bg-background" />;

  const handleBuy = async (pack: typeof packs[number]) => {
    if (buying) return;
    setBuying(pack.id);
    try {
      const { data, error } = await supabase.functions.invoke("add-credits", {
        body: { amount: pack.gems },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      refetch();
      toast.success("gems added!");
    } catch (err: any) {
      toast.error("buy error");
    } finally {
      setBuying(null);
    }
  };

  const handleClaimFree = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const { data, error } = await supabase.functions.invoke("claim-free-gems");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await refetch();
      setCanClaimFree(false);
      toast.success("gems added!");
    } catch (err: any) {
      toast.error("claim error");
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      <main className="relative z-[1] w-full max-w-lg mx-auto px-4 pt-10 pb-[280px]">
        <div className="flex items-center gap-3 mb-8 w-full">
          <BackButton />
          <PageTitle className="mb-0">get your gems</PageTitle>
        </div>

        <div className="flex flex-col gap-5">
          {/* Free gems claim */}
          <AnimatePresence>
            {claimChecked && canClaimFree && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.15 }}
                className="relative rounded-[10px] overflow-hidden p-5"
                style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 50%, #f59e0b 100%)",
                  border: "2px solid hsl(var(--border-mid))",
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <Gift size={20} strokeWidth={2.5} className="text-white" />
                      <span className="text-lg font-[900] lowercase text-white">welcome gift!</span>
                    </div>
                    <p className="text-[13px] font-[700] lowercase text-white/80 leading-tight mb-3">
                      claim your free gems to get started
                    </p>
                    <button
                      onClick={handleClaimFree}
                      disabled={claiming}
                      className="flex items-center gap-2 rounded-[10px] px-5 py-3 text-sm font-[900] lowercase transition-all active:scale-95 disabled:opacity-60"
                      style={{ backgroundColor: "#fff", color: "#000" }}
                    >
                      {claiming ? (
                        "claiming..."
                      ) : (
                        <>
                          <Sparkles size={16} strokeWidth={2.5} />
                          claim 5 free gems
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center justify-center w-16 h-16 rounded-full bg-card">
                    <Gem size={28} strokeWidth={2.5} className="text-white" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {packs.map((pack) => (
            <div
              key={pack.id}
              className="relative rounded-[10px] overflow-hidden p-5 flex gap-4"
              style={{
                backgroundColor: "#000",
                border: "2px solid hsl(var(--border-mid))",
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
                    <span className="inline-block rounded-[10px] px-3 py-1 text-[10px] font-[900] lowercase bg-neon-yellow text-neon-yellow-foreground">
                      {pack.badge}
                    </span>
                  </div>
                )}

                <div className="mt-auto pt-2">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-[10px] px-3.5 py-1.5 text-[13px] font-[900] lowercase text-white"
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
                onClick={(e) => {
                  const btn = e.currentTarget.querySelector('.cart-btn') as HTMLElement;
                  if (btn) { btn.style.backgroundColor = '#c4b000'; setTimeout(() => { btn.style.backgroundColor = ''; }, 150); }
                  handleBuy(pack);
                }}
                className="relative z-[1] flex flex-col items-center justify-center gap-3 min-w-[90px] active:scale-95"
                style={{ opacity: buying === pack.id ? 0.6 : 1 }}
              >
                <span className="text-3xl font-[900] text-white">${pack.price}</span>
                <span
                  className="cart-btn rounded-[10px] px-5 py-3 bg-neon-yellow text-neon-yellow-foreground flex items-center justify-center"
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
