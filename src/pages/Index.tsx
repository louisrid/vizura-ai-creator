import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Camera, SmartphoneNfc, Brush } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PaywallOverlay from "@/components/PaywallOverlay";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";

const randomPrompts = [
  "cyberpunk warrior with neon tattoos, confident stance, leather jacket",
  "ethereal elf princess, silver hair, glowing eyes, forest armor",
  "street samurai, scarred face, katana, rain-soaked city backdrop",
  "steampunk inventor, goggles, brass arm, wild curly hair",
  "space bounty hunter, sleek helmet, dark bodysuit, holographic badge",
];

const stylePresets = [
  { label: "ig photo", icon: Camera, suffix: ", professional instagram photography, natural lighting, shallow depth of field, photorealistic" },
  { label: "ig selfie", icon: SmartphoneNfc, suffix: ", instagram selfie style, front-facing camera, natural skin texture, soft ring light, photorealistic" },
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

  const handleRandomize = () => {
    setPrompt(randomPrompts[Math.floor(Math.random() * randomPrompts.length)]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <main className="w-full max-w-4xl mx-auto pt-10 md:pt-14 pb-8 px-4 sm:px-6">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-5">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold lowercase tracking-tight">generate</h1>
          {user && (
            <div className="border-[3px] border-foreground px-4 py-2 font-extrabold lowercase text-sm sm:text-base shrink-0">
              {credits} credit{credits !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Prompt input */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="describe your character…"
          rows={4}
          className="w-full border-[3px] border-foreground bg-background text-foreground p-4 sm:p-5 text-base sm:text-lg font-extrabold lowercase placeholder:text-foreground/30 focus:outline-none focus:ring-2 focus:ring-foreground resize-none mb-4"
        />

        {/* Style presets */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {stylePresets.map((style, i) => {
            const Icon = style.icon;
            const isActive = activeStyle === i;
            return (
              <button
                key={style.label}
                onClick={() => setActiveStyle(i)}
                className={`flex items-center justify-center gap-1.5 sm:gap-2.5 border-[3px] px-2 sm:px-4 py-3 sm:py-4 font-extrabold lowercase text-xs sm:text-base tracking-tight transition-all ${
                  isActive
                    ? "border-foreground bg-foreground text-background"
                    : "border-foreground text-foreground hover:bg-foreground/5"
                }`}
              >
                <Icon size={20} strokeWidth={3} className="shrink-0" />
                <span className="truncate">{style.label}</span>
              </button>
            );
          })}
        </div>

        {error && (
          <div className="border-[3px] border-destructive p-4 mb-4 text-destructive font-extrabold lowercase text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mb-10">
          <Button
            size="xl"
            variant="hero"
            className="flex-1 text-lg sm:text-xl [&_svg]:size-5 sm:[&_svg]:size-6 h-16 sm:h-20"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" strokeWidth={3} />
                generating…
              </>
            ) : (
              "generate"
            )}
          </Button>
          <Button
            size="xl"
            variant="outline"
            onClick={handleRandomize}
            disabled={isGenerating}
            className="text-lg sm:text-xl [&_svg]:size-5 sm:[&_svg]:size-6 border-[3px] h-16 sm:h-20"
          >
            <Shuffle className="mr-1.5 sm:mr-2" strokeWidth={3} />
            random
          </Button>
        </div>

        {/* Results */}
        <AnimatePresence>
          {images.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h2 className="text-2xl font-extrabold lowercase tracking-tight text-center mb-6">results</h2>
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
      </main>
    </div>
  );
};

export default Index;
