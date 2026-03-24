import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Shuffle, Camera, SmartphoneNfc, Brush } from "lucide-react";
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
  { label: "instagram photo", icon: Camera, suffix: ", professional instagram photography, natural lighting, shallow depth of field, photorealistic" },
  { label: "instagram selfie", icon: SmartphoneNfc, suffix: ", instagram selfie style, front-facing camera, natural skin texture, soft ring light, photorealistic" },
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
  const [activeStyle, setActiveStyle] = useState<number | null>(null);

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

    const styleSuffix = activeStyle !== null ? stylePresets[activeStyle].suffix : "";
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

      <main className="container max-w-4xl pt-16 md:pt-24 pb-8">
        {/* Top bar: credits + status */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-heading">generate a character</h1>
            <p className="text-muted-foreground text-sm font-semibold lowercase mt-0.5">describe a look, pick a style & hit generate</p>
          </div>
          {user && (
            <div className="border-2 border-foreground px-4 py-1.5 font-extrabold lowercase text-sm">
              {credits} credit{credits !== 1 ? "s" : ""}
            </div>
          )}
        </div>

        {/* Prompt input */}
        <div className="mb-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="face shape, hair, outfit, pose, mood, background…"
            rows={4}
            className="w-full border-2 border-foreground bg-background text-foreground p-4 text-sm font-semibold lowercase placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-foreground resize-none"
          />
        </div>

        {/* Style presets */}
        <div className="mb-5">
          <p className="font-extrabold lowercase text-xs text-muted-foreground mb-2">style preset</p>
          <div className="grid grid-cols-3 gap-2">
            {stylePresets.map((style, i) => {
              const Icon = style.icon;
              const isActive = activeStyle === i;
              return (
                <button
                  key={style.label}
                  onClick={() => setActiveStyle(isActive ? null : i)}
                  className={`flex items-center gap-2 border-2 px-3 py-2 font-extrabold lowercase text-xs transition-all ${
                    isActive
                      ? "border-accent-purple bg-accent-purple/10 text-foreground"
                      : "border-foreground/20 text-muted-foreground hover:border-foreground hover:text-foreground"
                  }`}
                >
                  <Icon size={14} />
                  {style.label}
                </button>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="border-2 border-destructive p-3 mb-4 text-destructive font-semibold lowercase text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-10">
          <Button
            size="lg"
            variant="hero"
            className="flex-1"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin" />
                generating…
              </>
            ) : (
              "generate"
            )}
          </Button>
          <Button size="lg" variant="outline" onClick={handleRandomize} disabled={isGenerating}>
            <Shuffle className="mr-2" />
            randomize
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
              <h2 className="text-heading mb-1 text-center">done</h2>
              <p className="text-muted-foreground text-sm text-center mb-6">3 angles from your prompt</p>
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
                    <div className="p-4 text-center font-extrabold lowercase text-sm">
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
