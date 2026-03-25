import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Camera, SmartphoneNfc, Brush, Sparkles, Download, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import BackButton from "@/components/BackButton";
import PageTransition from "@/components/PageTransition";
import PaywallOverlay from "@/components/PaywallOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";

const stylePresets = [
  { label: "ig photo", icon: Camera, suffix: ", professional instagram photography, natural lighting, shallow depth of field, photorealistic" },
  { label: "ig selfie", icon: SmartphoneNfc, suffix: ", instagram selfie style, front-facing camera, natural skin texture, soft ring light, photorealistic" },
  { label: "freestyle", icon: Brush, suffix: ", photorealistic, hyperdetailed, cinematic lighting" },
];

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");
  const [activeStyle, setActiveStyle] = useState<number>(0);

  useEffect(() => {
    if (searchParams.get("upgrade") === "true") setShowPaywall(true);
  }, [searchParams]);

  const handleGenerate = async () => {
    if (!user) { navigate("/auth"); return; }
    if (credits <= 0) { setShowPaywall(true); return; }
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setImages([]);
    setError("");

    const fullPrompt = prompt.trim() + stylePresets[activeStyle].suffix;

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate", {
        body: { prompt: fullPrompt },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);
      setImages(data.images || []);
      await refetchCredits();
    } catch (e: any) {
      if (e.message?.includes("No credits") || e.message?.includes("402")) {
        setShowPaywall(true);
      } else {
        setError(e.message || "generation failed");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <PageTransition>
        <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-10">
          <div className="flex items-center gap-3 mb-3">
            <BackButton />
            <p className="text-[10px] font-bold lowercase text-muted-foreground">
              type anything, get 3 photorealistic angles
            </p>
          </div>

          {/* Credits */}
          {user && (
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1 text-[10px] font-extrabold text-muted-foreground lowercase">
                <Sparkles size={12} className="text-accent-purple" />
                {credits} credit{credits !== 1 ? "s" : ""}
              </div>
              <button onClick={() => setShowPaywall(true)} className="text-[10px] font-extrabold lowercase text-foreground underline">
                get more
              </button>
            </div>
          )}

          {/* Prompt */}
          <input
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="describe your character…"
            className="w-full border-2 border-border bg-background text-foreground px-3 py-2.5 text-xs font-extrabold lowercase placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 rounded-xl mb-3 transition-colors"
          />

          {/* Style presets */}
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {stylePresets.map((style, i) => {
              const Icon = style.icon;
              return (
                <button
                  key={style.label}
                  onClick={() => setActiveStyle(i)}
                  className={`flex items-center justify-center gap-1.5 border-2 py-2 font-extrabold lowercase text-xs transition-all rounded-xl ${
                    activeStyle === i
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-foreground hover:border-foreground/30"
                  }`}
                >
                  <Icon size={14} strokeWidth={2.5} />
                  {style.label}
                </button>
              );
            })}
          </div>

          {error && (
            <div className="border-2 border-destructive/30 bg-destructive/5 p-2.5 mb-3 text-destructive font-extrabold lowercase text-[10px] rounded-xl">
              {error}
            </div>
          )}

          <Button
            className="w-full h-12 mb-4"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <><Loader2 className="animate-spin" size={14} />generating…</>
            ) : (
              <><Zap size={14} strokeWidth={2.5} />create</>
            )}
          </Button>

          {/* Results */}
          <AnimatePresence>
            {images.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.15 }}>
                <div className="grid grid-cols-3 gap-2">
                  {images.map((src, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05, duration: 0.15 }}
                      className="group relative rounded-xl overflow-hidden border-2 border-border"
                    >
                      <img src={src} alt={`angle ${i + 1}`} className="w-full aspect-[3/4] object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                        <span className="text-white font-extrabold lowercase text-[10px]">
                          {["front", "left", "right"][i]}
                        </span>
                        <a href={src} download={`vizura-${["front", "left", "right"][i]}.png`} className="w-6 h-6 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/40 transition-colors">
                          <Download size={10} className="text-white" />
                        </a>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </PageTransition>
    </div>
  );
};

export default Index;
