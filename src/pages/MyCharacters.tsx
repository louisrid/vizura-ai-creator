import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Wand2, Pencil, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import PaywallOverlay from "@/components/PaywallOverlay";
import PageTitle from "@/components/PageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";

interface Generation {
  id: string;
  prompt: string;
  image_urls: string[];
  created_at: string;
}

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
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      
        <main className="w-full max-w-lg mx-auto px-4 pt-12 pb-12">
          <div className="flex items-center gap-3 mb-10">
            <BackButton />
          </div>
          <PageTitle>my characters</PageTitle>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="animate-spin text-foreground" size={24} />
            </div>
          ) : generations.length === 0 ? (
            <div className="border-[3px] border-border rounded-2xl p-6 text-center">
              <p className="text-xs font-extrabold lowercase mb-3">no characters yet</p>
              <Button variant="outline" className="h-10" onClick={() => navigate("/")}>
                start creating
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {generations.map((gen) => (
                <button
                  key={gen.id}
                  onClick={() => { setSelected(gen); setAngleIndex(0); }}
                  className="rounded-2xl border-[3px] border-border overflow-hidden bg-background hover:border-foreground/60 transition-all active:scale-[0.98]"
                >
                  <img src={gen.image_urls[0]} alt="" className="w-full aspect-[3/4] object-cover" />
                </button>
              ))}
            </div>
          )}
        </main>
      

      {/* Expanded view */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm px-4"
            onClick={() => setSelected(null)}
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="bg-card border-[3px] border-border rounded-2xl shadow-medium w-full max-w-sm overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative">
                <img
                  src={selected.image_urls[angleIndex] || selected.image_urls[0]}
                  alt=""
                  className="w-full aspect-[3/4] object-cover"
                />

                {angleIndex > 0 && (
                  <button
                    onClick={() => setAngleIndex(angleIndex - 1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl bg-black/30 backdrop-blur flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                  >
                    <ChevronLeft size={18} strokeWidth={2.5} />
                  </button>
                )}

                {angleIndex < (selected.image_urls.length - 1) && (
                  <button
                    onClick={() => setAngleIndex(angleIndex + 1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl bg-black/30 backdrop-blur flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                  >
                    <ChevronRight size={18} strokeWidth={2.5} />
                  </button>
                )}

                <button
                  onClick={() => setSelected(null)}
                  className="absolute top-2 right-2 w-8 h-8 rounded-2xl bg-black/30 backdrop-blur flex items-center justify-center text-white hover:bg-black/50 transition-colors"
                >
                  <X size={14} strokeWidth={2.5} />
                </button>
              </div>

              <div className="flex gap-2 p-4">
                <Button variant="outline" className="flex-1 h-10" onClick={() => handleEdit(selected)}>
                  <Pencil size={14} strokeWidth={2.5} /> edit
                </Button>
                <Button variant="outline" className="flex-1 h-10" onClick={() => handleVariation(selected)} disabled={isGenerating}>
                  {isGenerating ? (
                    <><Loader2 className="animate-spin" size={14} /> creating…</>
                  ) : (
                    <><Wand2 size={14} strokeWidth={2.5} /> variation</>
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
