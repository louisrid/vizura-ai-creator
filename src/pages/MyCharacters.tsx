import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Wand2, Pencil, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PaywallOverlay from "@/components/PaywallOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";

interface Generation {
  id: string;
  prompt: string;
  image_urls: string[];
  created_at: string;
}

const angleLabels = ["front", "left", "right"];

const MyCharacters = () => {
  const { user, loading: authLoading } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const navigate = useNavigate();
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Generation | null>(null);
  const [angleIndex, setAngleIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const fetch = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setGenerations((data as Generation[]) || []);
      setLoading(false);
    };
    if (user) fetch();
  }, [user]);

  const handleEdit = (gen: Generation) => {
    // Navigate to creator with prompt pre-filled via search params
    navigate(`/?edit=${encodeURIComponent(gen.prompt)}`);
  };

  const handleVariation = async (gen: Generation) => {
    if (!user) { navigate("/auth"); return; }
    if (credits <= 0) { setShowPaywall(true); return; }
    setIsGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate", {
        body: { prompt: gen.prompt + ", subtle variation, keep same overall appearance" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      // Refresh list
      const { data: refreshed } = await supabase
        .from("generations")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setGenerations((refreshed as Generation[]) || []);
      await refetchCredits();
      setSelected(null);
    } catch (e: any) {
      if (e.message?.includes("No credits") || e.message?.includes("402")) setShowPaywall(true);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-10">
        <p className="text-xs font-bold lowercase text-muted-foreground text-center mb-4">
          my characters
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="animate-spin text-muted-foreground" size={24} />
          </div>
        ) : generations.length === 0 ? (
          <div className="border-2 border-border rounded-xl p-8 text-center">
            <p className="text-sm font-extrabold lowercase mb-3">no characters yet</p>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl border-2 text-xs"
              onClick={() => navigate("/")}
            >
              start creating
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {generations.map((gen) => (
              <button
                key={gen.id}
                onClick={() => { setSelected(gen); setAngleIndex(0); }}
                className="rounded-xl border-2 border-border overflow-hidden bg-background hover:border-foreground/30 transition-all active:scale-[0.98]"
              >
                <img
                  src={gen.image_urls[0]}
                  alt=""
                  className="w-full aspect-[3/4] object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Expanded view modal */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm px-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 8 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 8 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-card border-2 border-border rounded-2xl shadow-medium w-full max-w-sm overflow-hidden"
            >
              {/* Image with swipe arrows */}
              <div className="relative">
                <img
                  src={selected.image_urls[angleIndex] || selected.image_urls[0]}
                  alt={angleLabels[angleIndex]}
                  className="w-full aspect-[3/4] object-cover"
                />

                {/* Angle label */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/40 to-transparent px-3 pb-2.5 pt-6">
                  <span className="text-white font-extrabold lowercase text-[11px]">{angleLabels[angleIndex]}</span>
                </div>

                {/* Left arrow */}
                {angleIndex > 0 && (
                  <button
                    onClick={() => setAngleIndex(angleIndex - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                  >
                    <ChevronLeft size={16} strokeWidth={2.5} />
                  </button>
                )}

                {/* Right arrow */}
                {angleIndex < (selected.image_urls.length - 1) && (
                  <button
                    onClick={() => setAngleIndex(angleIndex + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/30 backdrop-blur flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                  >
                    <ChevronRight size={16} strokeWidth={2.5} />
                  </button>
                )}

                {/* Close */}
                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/30 backdrop-blur flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>

              {/* Dots */}
              <div className="flex justify-center gap-1.5 py-2.5">
                {angleLabels.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setAngleIndex(i)}
                    className={`h-1.5 rounded-full transition-all ${i === angleIndex ? "w-5 bg-foreground" : "w-1.5 bg-foreground/20"}`}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex gap-2 px-4 pb-4">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl border-2 h-10 text-xs"
                  onClick={() => handleEdit(selected)}
                >
                  <Pencil size={14} strokeWidth={2.5} /> edit
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 rounded-xl border-2 h-10 text-xs"
                  onClick={() => handleVariation(selected)}
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <><Loader2 className="animate-spin" size={14} /> generating…</>
                  ) : (
                    <><Wand2 size={14} strokeWidth={2.5} /> new variation</>
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MyCharacters;
