import { useEffect, useState } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Loader2, Camera, SmartphoneNfc, Brush, Sparkles, Download, Zap, Shuffle, Wand2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import BackButton from "@/components/BackButton";
import PaywallOverlay from "@/components/PaywallOverlay";
import PageTitle from "@/components/PageTitle";
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
  const location = useLocation();
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
    toast({ title: "coming soon", description: "photo creation will be available soon" });
    return;
    if (!user) { navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`); return; }
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

  const primaryImage = images[0];

  return (
    <div className="min-h-screen bg-background">
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      
        <main className="w-full max-w-lg mx-auto px-4 pt-12 pb-12">
          <div className="flex items-center gap-3 mb-10">
            <BackButton />
          </div>
          <PageTitle>create photo</PageTitle>

          <div className="relative mb-10 overflow-hidden rounded-2xl border-[4px] border-border bg-card aspect-[4/5]">
            {primaryImage ? (
              <>
                <img src={primaryImage} alt="generated photo" className="h-full w-full object-cover" />
                <a
                  href={primaryImage}
                  download="vizura-photo.png"
                  className="absolute bottom-3 right-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-foreground text-background transition-colors hover:bg-foreground/90"
                  aria-label="download photo"
                >
                  <Download size={14} />
                </a>
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <Wand2 size={28} className="text-foreground" />
              </div>
            )}
          </div>

          {user && (
            <div className="flex items-center justify-end gap-1 text-xs font-extrabold text-foreground lowercase mb-10">
              <Sparkles size={14} style={{ stroke: "url(#icon-gradient-purple)" }} />
              {credits} credit{credits !== 1 ? "s" : ""}
            </div>
          )}

          <div className="space-y-10">
            <div>
              <span className="block text-xs font-extrabold lowercase text-foreground mb-3">describe your photo</span>
              <input
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="woman in golden hour light, rooftop…"
                className="w-full border-[4px] border-border bg-background text-foreground px-4 py-4 text-sm font-extrabold lowercase placeholder:text-foreground/30 focus:outline-none focus:border-foreground rounded-2xl transition-colors"
              />
            </div>

            <div>
              <span className="block text-xs font-extrabold lowercase text-foreground mb-3">style</span>
              <div className="flex gap-2">
                {stylePresets.map((style, i) => {
                  const Icon = style.icon;
                  return (
                    <button
                      key={style.label}
                      onClick={() => setActiveStyle(i)}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-4 rounded-2xl font-extrabold lowercase text-sm border-[4px] transition-all ${
                        activeStyle === i
                          ? "border-foreground bg-foreground text-background"
                          : "border-border text-foreground hover:border-foreground/60"
                      }`}
                    >
                      <Icon size={16} strokeWidth={2.5} />
                      {style.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {error && (
            <div className="border-[4px] border-destructive/30 bg-destructive/5 p-4 text-destructive font-extrabold lowercase text-sm rounded-2xl mt-10">
              {error}
            </div>
          )}

          <div className="flex gap-2 mt-10">
            <Button
              className="flex-1 h-16 text-sm"
              onClick={handleCreate}
              disabled={isGenerating || !prompt.trim()}
            >
              {isGenerating ? (
                <><Loader2 className="animate-spin" size={18} />creating…</>
              ) : (
                <><Zap size={18} strokeWidth={2.5} />create</>
              )}
            </Button>
            <Button
              variant="outline"
              className="h-16 px-5"
              onClick={handleRandom}
              disabled={isGenerating}
            >
              <Shuffle size={18} strokeWidth={2.5} />
            </Button>
          </div>
        </main>
      
    </div>
  );
};

export default Index;
