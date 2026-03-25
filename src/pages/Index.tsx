import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Camera, SmartphoneNfc, Brush, Sparkles, Download, ImageIcon, Zap } from "lucide-react";
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

const promptSuggestions = [
  "a confident woman with auburn hair in golden hour",
  "a man in a leather jacket on a city rooftop at night",
  "a surfer girl with sun-bleached hair on the beach",
  "a businessman in a tailored suit, editorial lighting",
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
  const styleShakeRef = useRef<HTMLDivElement>(null);
  const [btnBounceKey, setBtnBounceKey] = useState(0);

  useEffect(() => {
    if (searchParams.get("upgrade") === "true") {
      setShowPaywall(true);
    }
  }, [searchParams]);

  const handleStyleChange = useCallback((i: number) => {
    if (i !== activeStyle) {
      setActiveStyle(i);
      const el = styleShakeRef.current;
      if (el) {
        el.animate(
          [
            { transform: 'translateX(0px)' },
            { transform: 'translateX(-2px)' },
            { transform: 'translateX(1.5px)' },
            { transform: 'translateX(-0.5px)' },
            { transform: 'translateX(0px)' },
          ],
          { duration: 600, easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)' }
        );
      }
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
    <div className="min-h-screen gradient-subtle">
      <Header />
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: [0.25, 0.1, 0.25, 1] }}
        className="w-full max-w-3xl mx-auto pt-10 md:pt-16 pb-12 px-4 sm:px-6"
      >
        {/* Hero heading */}
        <div className="text-center mb-8">
          <h1 className="text-[clamp(2rem,7vw,3.5rem)] font-extrabold lowercase tracking-tight leading-none mb-3">
            create your photo
          </h1>
          <p className="text-muted-foreground text-sm font-semibold lowercase max-w-md mx-auto">
            describe a character and we'll generate photorealistic portraits in multiple angles
          </p>
        </div>

        {/* Main card */}
        <div className="bg-card rounded-2xl border border-border shadow-soft p-5 sm:p-6 mb-6">
          {/* Credits bar */}
          {user && (
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-bold text-muted-foreground lowercase">
                <Sparkles size={14} className="text-accent-purple" />
                {credits} credit{credits !== 1 ? "s" : ""} available
              </div>
              <button
                onClick={() => setShowPaywall(true)}
                className="text-xs font-extrabold lowercase text-accent-purple hover:underline"
              >
                get more
              </button>
            </div>
          )}

          {/* Prompt input */}
          <div className="relative mb-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="describe your character…"
              rows={3}
              className="w-full border border-border bg-background text-foreground p-4 pr-12 text-[clamp(0.9rem,3vw,1.1rem)] font-bold lowercase placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-accent-purple/30 focus:border-accent-purple/50 resize-none rounded-xl transition-shadow"
            />
            <ImageIcon size={18} className="absolute right-4 top-4 text-muted-foreground/30" />
          </div>

          {/* Quick prompts */}
          <div className="flex flex-wrap gap-2 mb-4">
            {promptSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => setPrompt(s)}
                className="text-xs font-bold lowercase px-3 py-1.5 rounded-full bg-accent hover:bg-accent-purple-light text-muted-foreground hover:text-accent-purple transition-colors border border-transparent hover:border-accent-purple/20"
              >
                {s.length > 35 ? s.slice(0, 35) + "…" : s}
              </button>
            ))}
          </div>

          {/* Style presets */}
          <div ref={styleShakeRef} className="grid grid-cols-3 gap-2 mb-5">
            {stylePresets.map((style, i) => {
              const Icon = style.icon;
              const isActive = activeStyle === i;
              return (
                <button
                  key={style.label}
                  onClick={() => handleStyleChange(i)}
                  className={`flex items-center justify-center gap-1.5 border px-2 py-3 font-extrabold lowercase text-[clamp(0.65rem,2.5vw,0.9rem)] tracking-tight transition-all rounded-xl ${
                    isActive
                      ? "border-foreground bg-foreground text-background shadow-soft"
                      : "border-border text-foreground hover:border-foreground/30 hover:shadow-soft"
                  }`}
                >
                  <Icon className="shrink-0 w-[clamp(14px,3.5vw,20px)] h-[clamp(14px,3.5vw,20px)]" strokeWidth={2.5} />
                  <span className="truncate">{style.label}</span>
                </button>
              );
            })}
          </div>

          {error && (
            <div className="border border-destructive/30 bg-destructive/5 p-3 mb-4 text-destructive font-bold lowercase text-sm rounded-lg">
              {error}
            </div>
          )}

          {/* Generate button */}
          <motion.div
            key={btnBounceKey}
            animate={btnBounceKey > 0 ? { x: [0, -4, 3, -1.5, 0.5, 0] } : undefined}
            transition={{ duration: 0.5, ease: [0.22, 0, 0.36, 1] }}
          >
            <Button
              size="xl"
              variant="hero"
              className="w-full text-[clamp(1.1rem,4vw,1.4rem)] [&_svg]:w-[clamp(18px,3.5vw,24px)] [&_svg]:h-[clamp(18px,3.5vw,24px)] h-[clamp(3.5rem,10vw,4.5rem)] disabled:opacity-60"
              onClick={() => { setBtnBounceKey((k) => k + 1); handleGenerate(); }}
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin" strokeWidth={2.5} />
                  generating…
                </>
              ) : (
                <>
                  <Zap strokeWidth={2.5} />
                  create
                </>
              )}
            </Button>
          </motion.div>
        </div>

        {/* Results */}
        <AnimatePresence>
          {images.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-card rounded-2xl border border-border shadow-soft p-5 sm:p-6">
                <h2 className="text-xl font-extrabold lowercase tracking-tight mb-4">your photos</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {images.map((src, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.15, duration: 0.4 }}
                      className="group relative rounded-xl overflow-hidden border border-border shadow-soft"
                    >
                      <img
                        src={src}
                        alt={`character angle ${i + 1}`}
                        className="w-full aspect-[2/3] object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                        <span className="text-white font-extrabold lowercase text-sm">
                          {["front", "left", "right"][i]}
                        </span>
                        <a
                          href={src}
                          download={`vizura-${["front", "left", "right"][i]}.png`}
                          className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center hover:bg-white/40 transition-colors"
                        >
                          <Download size={14} className="text-white" />
                        </a>
                      </div>
                      <div className="p-2.5 text-center font-extrabold lowercase text-xs text-muted-foreground sm:hidden">
                        {["front", "left", "right"][i]}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Info section */}
        {!images.length && !isGenerating && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
            <InfoCard icon={Camera} title="3 angles" description="front, left, and right views generated automatically" />
            <InfoCard icon={Sparkles} title="AI powered" description="photorealistic character portraits in seconds" />
            <InfoCard icon={Zap} title="instant" description="results delivered in under 30 seconds" />
          </div>
        )}
      </motion.main>
    </div>
  );
};

const InfoCard = ({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) => (
  <div className="bg-card rounded-xl border border-border p-4 text-center shadow-soft animate-fade-in-up">
    <div className="w-10 h-10 rounded-lg bg-accent-purple-light flex items-center justify-center mx-auto mb-3">
      <Icon size={18} className="text-accent-purple" strokeWidth={2.5} />
    </div>
    <h3 className="font-extrabold lowercase text-sm mb-1">{title}</h3>
    <p className="text-xs text-muted-foreground font-semibold lowercase">{description}</p>
  </div>
);

export default Index;
