import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Loader2, Zap, Sparkles, ChevronDown, ChevronUp, Gem, Upload } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";
import BackButton from "@/components/BackButton";
import PhotoGenerationOverlay from "@/components/PhotoGenerationOverlay";
import PaywallOverlay from "@/components/PaywallOverlay";
import PageTitle from "@/components/PageTitle";
import EmojiPreviewBox from "@/components/EmojiPreviewBox";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";
import { createEmojiPosterDataUrl, extractEmojiFromPosterDataUrl } from "@/lib/demoImages";
import { sanitiseText } from "@/lib/sanitise";

interface Character {
  id: string;
  name: string;
  country: string;
  age: string;
  hair: string;
  eye: string;
  body: string;
  style: string;
  description: string;
  face_image_url: string | null;
}

const PLACEHOLDER_PROMPTS = [
  "mirror selfie, pink hoodie",
  "beach sunset, white bikini",
  "gym, sports bra, leggings",
];

const buildPromptFromCharacter = (c: Character): string => {
  const ethnicityPart = c.country !== "any" ? `, ${c.country} ethnicity` : "";
  let prompt = `photorealistic portrait, ${c.age} year old woman${ethnicityPart}, ${c.body} body type, ${c.hair} hair, ${c.eye} eyes, ${c.style} style`;
  if (c.description.trim()) prompt += `, ${c.description.trim()}`;
  return prompt;
};

const PHOTO_LOADING_PHRASES = [
  "composing the scene…",
  "adding the details…",
  "rendering your photo…",
  "almost there…",
  "final touches…",
];

const DEMO_RESULT_EMOJIS = ["✨", "🌙", "💫", "🌸", "🦋", "⚡️", "💎", "🌞"];

/* ── Pill toggle (same style as character creation) ── */
const PillToggle = ({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs font-extrabold lowercase text-foreground">{label}</span>
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={`rounded-xl px-3.5 py-2 text-xs font-extrabold lowercase transition-all ${
            value === opt
              ? "bg-neon-yellow text-neon-yellow-foreground border-[3px] border-neon-yellow"
              : "border-[3px] border-border bg-card text-foreground/70 hover:border-foreground/40"
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

/* ── Cycling placeholder text ── */
const useCyclingPlaceholder = (texts: string[], interval = 3500) => {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % texts.length);
        setVisible(true);
      }, 400);
    }, interval);
    return () => clearInterval(timer);
  }, [texts.length, interval]);

  return { text: texts[index], visible };
};

const Index = () => {
  const { user } = useAuth();
  const { credits, gems, refetch: refetchCredits } = useCredits();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharId, setSelectedCharId] = useState("");
  const [photoOverlayPhase, setPhotoOverlayPhase] = useState<"hidden" | "loading" | "success">("hidden");
  const [photoOverlayResult, setPhotoOverlayResult] = useState<string | null>(null);
  const [fadingBack, setFadingBack] = useState(false);

  // New toggles
  const [photoType, setPhotoType] = useState("selfie");
  const [photoRatio, setPhotoRatio] = useState("4:5");

  // Collapsible vibe section
  const [vibeOpen, setVibeOpen] = useState(false);
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceStrength, setReferenceStrength] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const placeholder = useCyclingPlaceholder(PLACEHOLDER_PROMPTS);

  // Listen for tap-to-dismiss from photo overlay with fade
  useEffect(() => {
    const handler = () => {
      setFadingBack(true);
      setTimeout(() => {
        setPhotoOverlayPhase("hidden");
        setFadingBack(false);
      }, 100);
    };
    window.addEventListener("photo-overlay-dismiss", handler);
    return () => window.removeEventListener("photo-overlay-dismiss", handler);
  }, []);

  const preselectedCharacterId = (location.state as any)?.preselectedCharacterId;

  useEffect(() => {
    if (searchParams.get("upgrade") === "true") setShowPaywall(true);
  }, [searchParams]);

  useEffect(() => {
    const fetchCharacters = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data) {
        setCharacters(data as Character[]);
        if (data.length === 1) {
          setSelectedCharId(data[0].id);
        } else if (preselectedCharacterId) {
          const char = data.find((c: any) => c.id === preselectedCharacterId);
          if (char) { setSelectedCharId(preselectedCharacterId); }
        }
      }
    };
    fetchCharacters();
  }, [user, preselectedCharacterId]);

  const handleCharacterSelect = (charId: string) => {
    setSelectedCharId(charId);
    setPrompt("");
  };

  const selectedChar = useMemo(() => characters.find((c) => c.id === selectedCharId), [characters, selectedCharId]);
  const singleCharAutoSelected = characters.length === 1;

  // Get character emoji for thumbnail
  const charEmoji = useMemo(() => {
    if (!selectedChar?.face_image_url) return "✨";
    return extractEmojiFromPosterDataUrl(selectedChar.face_image_url) || "✨";
  }, [selectedChar]);

  // Highlight character name in prompt
  const renderPromptStyle = useMemo(() => {
    if (!selectedChar?.name || !prompt) return {};
    return {};
  }, [selectedChar, prompt]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceImage(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!user) { navigate(`/account?redirect=${encodeURIComponent("/create")}`); return; }
    if (credits <= 0) { setShowPaywall(true); return; }
    if (!prompt.trim()) { toast.error("describe your photo first"); return; }

    setIsGenerating(true);
    setImages([]);
    setError("");
    setPhotoOverlayPhase("loading");
    setPhotoOverlayResult(null);

    const cleanPrompt = sanitiseText(prompt.trim());
    const demoEmoji = DEMO_RESULT_EMOJIS[Math.floor(Math.random() * DEMO_RESULT_EMOJIS.length)];
    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate", {
        body: { prompt: cleanPrompt },
      });
      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      const isDemo = data?.demo === true;
      const generatedPreview = isDemo
        ? createEmojiPosterDataUrl(demoEmoji)
        : (data.images || [])[0] || null;
      const generatedImages = generatedPreview ? [generatedPreview] : (data.images || []);

      if (user && generatedImages.length > 0) {
        const { error: saveError } = await supabase.from("generations").insert({
          user_id: user.id,
          prompt: cleanPrompt,
          image_urls: generatedImages,
        });

        if (saveError) {
          throw new Error(saveError.message || "failed to save image");
        }
      }

      setPhotoOverlayResult(generatedPreview);
      setPhotoOverlayPhase("success");
      setImages(generatedImages);

      await refetchCredits();
      toast("1 gem used");
    } catch (e: any) {
      setPhotoOverlayPhase("hidden");
      if (e.message?.includes("No gems") || e.message?.includes("No credits") || e.message?.includes("402")) {
        setShowPaywall(true);
      } else {
        setError(e.message || "creation failed");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PhotoGenerationOverlay
        open={photoOverlayPhase !== "hidden"}
        phase={photoOverlayPhase === "hidden" ? "loading" : photoOverlayPhase}
        phrases={PHOTO_LOADING_PHRASES}
        resultImageUrl={photoOverlayResult}
      />
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <main className="w-full max-w-lg mx-auto px-4 pt-14 pb-10">
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
          <PageTitle className="mb-0">create photo</PageTitle>
        </div>

        {/* Hero image box with character thumbnail */}
        <div className="relative">
          {images[0] && extractEmojiFromPosterDataUrl(images[0]) ? (
            <EmojiPreviewBox
              emoji={extractEmojiFromPosterDataUrl(images[0]) || "✨"}
              className="mx-auto mb-8 h-[19rem] w-[19rem] max-w-full"
              emojiClassName="text-[4.75rem]"
            />
          ) : (
            <section className="mx-auto mb-8 flex w-[92%] max-w-[22rem] items-center justify-center rounded-2xl border-[5px] border-border bg-card" style={{ aspectRatio: "10/11" }}>
              {images[0] ? (
                <img src={images[0]} alt="generated photo" className="h-full w-full object-cover rounded-[calc(1rem-5px)]" />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neon-yellow">
                  <Sparkles size={28} strokeWidth={2.5} className="text-neon-yellow-foreground" />
                </div>
              )}
            </section>
          )}

          {/* Character emoji thumbnail */}
          {selectedCharId && (
            <div className="absolute top-2 right-[8%] flex h-10 w-10 items-center justify-center rounded-xl border-[3px] border-border bg-card">
              <span className="text-lg select-none">{charEmoji}</span>
            </div>
          )}
        </div>

        {/* Generate button — right below preview */}
        <div className="mt-5 mb-5">
          <button
            className="w-full h-16 rounded-2xl text-sm font-extrabold lowercase transition-all bg-neon-yellow text-neon-yellow-foreground hover:opacity-90 flex items-center justify-center gap-2 disabled:opacity-50"
            onClick={handleCreate}
            disabled={isGenerating || (!!user && !prompt.trim())}
          >
            {isGenerating ? (
              <><Loader2 className="animate-spin" size={18} />creating...</>
            ) : (
              <>
                <Zap size={18} strokeWidth={2.5} />
                create
                <Gem size={14} strokeWidth={2.5} className="text-gem-green ml-1" />
                <span className="text-[11px] ml-0.5">1</span>
              </>
            )}
          </button>
        </div>

        <div className="space-y-5">
          {/* Character select — hidden if only 1 character */}
          {!singleCharAutoSelected && (
            <div>
              <span className="block text-xs font-extrabold lowercase text-foreground mb-3">select character</span>
              <label className="relative block">
                <select
                  value={selectedCharId}
                  onChange={(e) => handleCharacterSelect(e.target.value)}
                  className="h-14 w-full appearance-none rounded-2xl border-[5px] border-border bg-card px-4 pr-10 text-sm font-extrabold lowercase text-foreground outline-none transition-colors focus:border-foreground"
                >
                  <option value="">none</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || `${c.hair} hair, ${c.eye} eyes, ${c.age}y`}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={16}
                  strokeWidth={2.5}
                  className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-foreground"
                />
              </label>
              {characters.length === 0 && user && (
                <button
                  onClick={() => { sessionStorage.setItem("vizura_internal_nav", "1"); navigate("/"); }}
                  className="mt-2 text-[10px] font-extrabold lowercase text-neon-yellow hover:opacity-80 transition-colors"
                >
                  create your first character →
                </button>
              )}
            </div>
          )}

          {/* Type toggle */}
          <PillToggle label="type" options={["selfie", "photo"]} value={photoType} onChange={setPhotoType} />

          {/* Ratio toggle */}
          <PillToggle label="ratio" options={["4:5", "9:16"]} value={photoRatio} onChange={setPhotoRatio} />

          {/* Prompt with cycling placeholder */}
          <div>
            <span className="block text-xs font-extrabold lowercase text-foreground mb-3">describe your photo</span>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                className="w-full resize-none rounded-2xl border-[5px] border-border bg-card px-4 py-4 text-sm font-extrabold lowercase text-foreground focus:outline-none focus:border-foreground transition-colors"
                style={{
                  caretColor: "hsl(var(--foreground))",
                }}
              />
              {/* Cycling placeholder when empty */}
              {!prompt && (
                <div className="pointer-events-none absolute left-4 top-4 right-4">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={placeholder.text}
                      className="text-sm font-extrabold lowercase text-foreground/30"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: placeholder.visible ? 1 : 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.4 }}
                    >
                      {placeholder.text}
                    </motion.span>
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          {/* Reference section — always visible */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-extrabold lowercase text-foreground">add a reference</span>
              <span className="text-[10px] font-extrabold lowercase text-muted-foreground">(optional)</span>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            {referenceImage ? (
              <div className="relative w-full h-32 rounded-2xl overflow-hidden border-[5px] border-border">
                <img src={referenceImage} alt="Reference" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setReferenceImage(null)}
                  className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white text-xs font-bold"
                >
                  ×
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-[3px] border-dashed border-foreground/15 bg-card py-8 hover:border-foreground/30 transition-colors"
              >
                <Upload size={24} strokeWidth={2.5} className="text-foreground/30" />
                <span className="text-xs font-extrabold lowercase text-foreground/30">add reference image</span>
              </button>
            )}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] font-extrabold lowercase text-foreground/50">strength</span>
              <span className="text-[10px] font-extrabold lowercase text-foreground/50">{referenceStrength}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={referenceStrength}
              onChange={(e) => setReferenceStrength(Number(e.target.value))}
              className="mt-2 w-full cursor-pointer appearance-none rounded-full h-2"
              style={{ background: `linear-gradient(to right, hsl(var(--neon-yellow)) ${referenceStrength}%, hsl(var(--secondary)) ${referenceStrength}%)` }}
            />
          </div>
        </div>

        {error && (
          <div className="mt-5 rounded-2xl border-[5px] border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive">
            {error}
          </div>
        )}

      </main>
    </div>
  );
};

export default Index;
