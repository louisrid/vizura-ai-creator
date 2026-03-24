import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Camera, SmartphoneNfc, Brush } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PaywallOverlay from "@/components/PaywallOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";


const stylePresets = [
  { label: "IG photo", icon: Camera, suffix: ", professional instagram photography, natural lighting, shallow depth of field, photorealistic" },
  { label: "IG selfie", icon: SmartphoneNfc, suffix: ", instagram selfie style, front-facing camera, natural skin texture, soft ring light, photorealistic" },
  { label: "freestyle", icon: Brush, suffix: ", photorealistic, hyperdetailed, cinematic lighting" },
];

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");
  const [activeStyle, setActiveStyle] = useState<number>(0);
  const [bounceKey, setBounceKey] = useState(0);

  const handleStyleChange = useCallback((i: number) => {
    if (i !== activeStyle) {
      setActiveStyle(i);
      setBounceKey((k) => k + 1);
    }
  }, [activeStyle]);
  const handleGenerate = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (credits <= 0) {
      setShowPaywall(true);
      return;
    }
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setImages([]);
    setError("");

    const styleSuffix = stylePresets[activeStyle].suffix;
    const fullPrompt = prompt.trim() + styleSuffix;

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate", {
        body: { prompt: fullPrompt },
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setImages(data.images || []);
      await refetchCredits();
    } catch (e: any) {
      console.error("Generation error:", e);
      if (e.message?.includes("No credits") || e.message?.includes("402")) {
        setShowPaywall(true);
      } else {
        setError(e.message || "generation failed. please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <motion.main
        key={bounceKey}
        initial={bounceKey === 0 ? { opacity: 0, y: 10 } : { x: 12 }}
        animate={bounceKey === 0 ? { opacity: 1, y: 0 } : { x: 0 }}
        transition={
          bounceKey === 0
            ? { duration: 0.3, ease: "easeOut" }
            : { type: "spring", stiffness: 200, damping: 12, mass: 1.2 }
        }
        className="w-full max-w-4xl mx-auto pt-16 md:pt-24 pb-8 px-4 sm:px-6"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between mb-4 gap-3">
          <h1 className="text-[clamp(1.75rem,7vw,3.5rem)] font-extrabold lowercase tracking-tight leading-none">create a photo</h1>
          {user && (
            <div className="border-[3px] border-foreground px-4 py-2 font-extrabold lowercase text-[clamp(0.75rem,2.5vw,1.125rem)] shrink-0 whitespace-nowrap">
              {credits} credit{credits !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Prompt input */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="describe your character…"
          rows={3}
          className="w-full border-[3px] border-foreground bg-background text-foreground p-4 text-[clamp(0.95rem,3vw,1.25rem)] font-extrabold lowercase placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground resize-none mb-3"
        />

        {/* Style presets */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {stylePresets.map((style, i) => {
            const Icon = style.icon;
            const isActive = activeStyle === i;
            return (
              <button
                key={style.label}
                onClick={() => handleStyleChange(i)}
                className={`flex items-center justify-center gap-1.5 border-[3px] px-2 py-3 font-extrabold lowercase text-[clamp(0.65rem,2.5vw,1rem)] tracking-tight transition-all ${
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground text-foreground hover:bg-foreground/5"
                }`}
              >
                <Icon className="shrink-0 w-[clamp(16px,4vw,24px)] h-[clamp(16px,4vw,24px)]" strokeWidth={3} />
                <span className="truncate">{style.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="border-[3px] border-destructive p-3 mb-3 text-destructive font-extrabold lowercase text-sm">
            {error}
          </div>
        )}

        {/* Action */}
        <Button
          size="xl"
          variant="hero"
          className="w-full text-[clamp(1.1rem,4vw,1.5rem)] [&_svg]:w-[clamp(20px,4vw,28px)] [&_svg]:h-[clamp(20px,4vw,28px)] h-[clamp(3.5rem,10vw,5.5rem)] mb-8 disabled:opacity-100 disabled:bg-primary disabled:text-primary-foreground"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
        >
          {isGenerating ? (
            <>
              <Loader2 className="animate-spin" strokeWidth={3} />
              generating…
            </>
          ) : (
            "create"
          )}
        </Button>

        {/* Results */}
        <AnimatePresence>
          {images.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-3xl font-extrabold lowercase tracking-tight text-center mb-6">results</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {images.map((src, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.15, duration: 0.4 }}
                    className="border-2 border-foreground overflow-hidden"
                  >
                    <img
                      src={src}
                      alt={`character angle ${i + 1}`}
                      className="w-full aspect-[2/3] object-cover"
                    />
                    <div className="p-3 text-center font-extrabold lowercase text-sm">
                      {["front", "left", "right"][i]}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.main>
    </div>
  );
};

export default Index;
