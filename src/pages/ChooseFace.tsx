import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, Check, RefreshCw, Gem } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import PageTitle from "@/components/PageTitle";
import CookingOverlay from "@/components/CookingOverlay";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useGems } from "@/contexts/CreditsContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { supabase } from "@/integrations/supabase/client";
import PaywallOverlay from "@/components/PaywallOverlay";

const ChooseFace = () => {
  const { user } = useAuth();
  const { gems, refetch: refetchGems } = useGems();
  const { subscribed } = useSubscription();
  const navigate = useNavigate();
  const location = useLocation();

  const { prompt, characterId } = (location.state as {
    prompt?: string;
    characterId?: string;
  }) || {};

  const [faces, setFaces] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [showCooking, setShowCooking] = useState(false);
  const [rerolling, setRerolling] = useState(false);

  useEffect(() => {
    if (!prompt || !user) { navigate("/"); return; }
    generateFaces();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const generateFaces = async () => {
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate", {
        body: { prompt, free_gen: true },
      });
      if (fnError) throw fnError;
      if (data?.error) {
        if (data.code === "FREE_GEN_USED" || data.code === "IP_USED") {
          setShowPaywall(true);
          setLoading(false);
          return;
        }
        throw new Error(data.error);
      }
      // Take first 3 images for the 3-box layout
      const imgs = data.images || [];
      setFaces(imgs.slice(0, 3));
      setSelectedIndex(null);
    } catch (err: any) {
      const msg = err?.message || "generation failed";
      if (msg.includes("Free generation") || msg.includes("IP_USED") || msg.includes("FREE_GEN_USED")) {
        setShowPaywall(true);
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    setRerolling(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate", {
        body: { prompt },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setFaces((data.images || []).slice(0, 3));
      setSelectedIndex(null);
      await refetchGems();
      toast("1 gem used");
    } catch (err: any) {
      toast.error(err?.message || "regeneration failed");
    } finally {
      setRerolling(false);
    }
  };

  const handleConfirm = async () => {
    if (selectedIndex === null || !characterId || !user) return;
    // Save face to character
    try {
      const selectedUrl = faces[selectedIndex];
      await supabase
        .from("characters")
        .update({ face_image_url: selectedUrl, generation_prompt: prompt } as any)
        .eq("id", characterId);
    } catch {}
    // Start cooking
    setShowCooking(true);
  };

  const handleCookingComplete = () => {
    setShowCooking(false);
    toast.success("character added!");
    navigate("/characters");
  };

  if (showPaywall) {
    return (
      <div className="relative min-h-screen bg-background">
        <PaywallOverlay open={true} onClose={() => navigate("/")} hasSubscription={subscribed} />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-background">
      <CookingOverlay open={showCooking} onComplete={handleCookingComplete} />

      <main className="mx-auto flex w-full max-w-lg flex-col px-4 pt-14 pb-12">
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
          <PageTitle className="mb-0">pick your face</PageTitle>
        </div>

        {/* Gem balance */}
        <div className="flex items-center gap-2 mb-6">
          <Gem size={16} strokeWidth={2.5} className="text-gem-green" />
          <span className="text-sm font-extrabold lowercase text-foreground">{gems} gems</span>
        </div>

        {loading && (
          <div className="mt-16 flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-foreground" size={40} />
            <p className="text-sm font-extrabold lowercase text-muted-foreground">generating faces...</p>
          </div>
        )}

        {!loading && faces.length > 0 && (
          <>
            {/* 3 portrait boxes in a row */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              {faces.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedIndex(i)}
                  className={`relative aspect-[3/4] overflow-hidden rounded-2xl border-[5px] transition-all ${
                    selectedIndex === i
                      ? "border-neon-yellow"
                      : "border-border hover:border-foreground/40"
                  }`}
                >
                  <img src={url} alt={`face ${i + 1}`} className="h-full w-full object-cover" />
                  {selectedIndex === i && (
                    <div className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-neon-yellow">
                      <Check size={14} strokeWidth={3} className="text-neon-yellow-foreground" />
                    </div>
                  )}
                </button>
              ))}
              {/* Fill remaining slots with placeholders */}
              {Array.from({ length: Math.max(0, 3 - faces.length) }).map((_, i) => (
                <div
                  key={`placeholder-${i}`}
                  className="aspect-[3/4] rounded-2xl border-[5px] border-border bg-card"
                />
              ))}
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={handleRegenerate}
                disabled={rerolling}
                className="flex-1 h-14 rounded-2xl border-[5px] border-border bg-card text-sm font-extrabold lowercase text-foreground flex items-center justify-center gap-2 transition-colors hover:border-foreground/40 disabled:opacity-50"
              >
                {rerolling ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <>
                    <RefreshCw size={16} strokeWidth={2.5} />
                    regenerate
                    <Gem size={12} strokeWidth={2.5} className="text-gem-green" />
                    <span className="text-[11px]">1</span>
                  </>
                )}
              </button>
              <button
                onClick={handleConfirm}
                disabled={selectedIndex === null}
                className="flex-1 h-14 rounded-2xl bg-neon-yellow text-sm font-extrabold lowercase text-neon-yellow-foreground flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-50"
              >
                confirm
              </button>
            </div>
          </>
        )}

        {!loading && faces.length === 0 && !showPaywall && (
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl border-[5px] border-border bg-card" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default ChooseFace;
