import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Loader2, Camera, SmartphoneNfc, Brush, Sparkles, Download, Zap, Shuffle, Wand2 } from "lucide-react";
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

const randomPrompts = [
  "confident woman in golden hour light, rooftop terrace",
  "woman with freckles and green eyes, coffee shop, warm tones",
  "athletic woman, beach sunset, windswept hair",
  "elegant woman, black dress, city night lights",
  "woman with curly hair, studio portrait, soft shadows",
];

const Index = () => {
  const { user } = useAuth();
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

  const handleCreate = async () => {
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
        setError(e.message || "creation failed");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRandom = () => {
    const randomPrompt = randomPrompts[Math.floor(Math.random() * randomPrompts.length)];
    setPrompt(randomPrompt);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <PageTransition>
        <main className="w-full max-w-lg mx-auto px-4 pt-4 pb-10">
          <div className="flex items-center gap-3 mb-6">
            <BackButton />
          </div>

          {/* Result / Placeholder */}
          {images.length > 0 ? (
            <div className="grid grid-cols-3 gap-2 mb-4">
              {images.map((src, i) => (
                <div key={i} className="group relative rounded-xl overflow-hidden border-2 border-border">
                  <img src={src} alt="" className="w-full aspect-[3/4] object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-end p-2">
                    <a href={src} download={`vizura-${i}.png`} className="w-6 h-6 rounded-full bg-black/30 backdrop-blur flex items-center justify-center hover:bg-black/50 transition-colors">
                      <Download size={10} className="text-white" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border-2 border-border bg-muted aspect-[4/5] flex items-center justify-center mb-4">
              <Wand2 size={28} className="text-muted-foreground/30" />
            </div>
          )}

          {/* Credits */}
          {user && (
            <div className="flex items-center justify-end gap-1 text-[10px] font-extrabold text-muted-foreground lowercase mb-6">
              <Sparkles size={12} className="text-accent-purple" />
              {credits} credit{credits !== 1 ? "s" : ""}
            </div>
          )}

          {/* Prompt input */}
          <div className="space-y-6">
            <div>
              <span className="block text-xs font-extrabold lowercase text-muted-foreground mb-2">describe your photo</span>
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="woman in golden hour light, rooftop…"
                className="w-full border-2 border-border bg-background text-foreground px-4 py-3.5 text-xs font-extrabold lowercase placeholder:text-muted-foreground/40 focus:outline-none focus:border-foreground/40 rounded-xl transition-colors"
              />
            </div>

            {/* Style toggles */}
            <div>
              <span className="block text-xs font-extrabold lowercase text-muted-foreground mb-2">style</span>
              <div className="flex gap-2">
                {stylePresets.map((style, i) => {
                  const Icon = style.icon;
                  return (
                    <button
                      key={style.label}
                      onClick={() => setActiveStyle(i)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 rounded-xl font-extrabold lowercase text-xs border-2 transition-all ${
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
            </div>
          </div>

          {error && (
            <div className="border-2 border-destructive/30 bg-destructive/5 p-3 text-destructive font-extrabold lowercase text-xs rounded-xl mt-6">
              {error}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 mt-6">
            <Button
              className="flex-1 h-14 text-xs"
              onClick={handleCreate}
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? (
                <><Loader2 className="animate-spin" size={16} />creating…</>
              ) : (
                <><Zap size={16} strokeWidth={2.5} />create</>
              )}
            </Button>
            <Button
              variant="outline"
              className="h-14 px-4"
              onClick={handleRandom}
              disabled={isGenerating}
            >
              <Shuffle size={16} strokeWidth={2.5} />
            </Button>
          </div>
        </main>
      </PageTransition>
    </div>
  );
};

export default Index;
