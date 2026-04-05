import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Loader2, Zap, Sparkles, ChevronDown, Gem, Upload } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";
import BackButton from "@/components/BackButton";
import DotDecal from "@/components/DotDecal";
import PhotoGenerationOverlay from "@/components/PhotoGenerationOverlay";
import PaywallOverlay from "@/components/PaywallOverlay";
import PageTitle from "@/components/PageTitle";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { supabase } from "@/integrations/supabase/client";
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
  body_anchor_url?: string | null;
  face_angle_url?: string | null;
}

const PHOTO_LOADING_PHRASES = [
  "composing the scene…",
  "adding the details…",
  "rendering your photo…",
  "almost there…",
  "final touches…",
];


/* ── Pill toggle ── */
const PillToggle = ({ label, options, value, onChange, renderOption }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
  renderOption?: (opt: string) => React.ReactNode;
}) => (
  <div className="flex flex-col gap-1.5">
    <span className="text-xs font-[900] lowercase text-white">{label}</span>
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className="flex items-center gap-1.5 transition-all"
          style={{
            borderRadius: 11,
            padding: "10px 18px",
            fontSize: 16,
            fontWeight: 800,
            textTransform: "lowercase" as const,
            ...(value === opt
               ? { backgroundColor: "#facc15", color: "#000", border: "2px solid #facc15" }
              : { backgroundColor: "#111111", color: "rgba(255,255,255,0.55)", border: "2px solid #222" }
            ),
          }}
        >
          {renderOption ? renderOption(opt) : opt}
        </button>
      ))}
    </div>
  </div>
);

/* ── Cycling placeholder text with character name ── */
const useCyclingPlaceholder = (charName: string, interval = 3500) => {
  const templates = useMemo(() => {
    const name = charName || "luna";
    return [
      `${name} at the beach, white bikini, sunset`,
      `${name} mirror selfie, pink hoodie`,
      `${name} at the gym, sports bra, leggings`,
    ];
  }, [charName]);

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((i) => (i + 1) % templates.length);
        setVisible(true);
      }, 400);
    }, interval);
    return () => clearInterval(timer);
  }, [templates.length, interval]);

  return { text: templates[index], visible };
};

/* ── Highlighted text input component ── */
const HighlightedPromptArea = ({
  value, onChange, charName, placeholder
}: {
  value: string; onChange: (v: string) => void; charName: string;
  placeholder: React.ReactNode;
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const highlightedHtml = useMemo(() => {
    if (!charName || !value) return "";
    const regex = new RegExp(`(${charName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(regex, '<mark class="text-neon-yellow bg-transparent font-extrabold">$1</mark>');
  }, [value, charName]);

  return (
    <div className="relative">
      {value && charName && (
        <div
          className="pointer-events-none absolute inset-0 px-4 py-3 text-sm font-extrabold lowercase text-transparent whitespace-pre-wrap break-words overflow-hidden"
          style={{ wordBreak: "break-word" }}
          aria-hidden
          dangerouslySetInnerHTML={{ __html: highlightedHtml }}
        />
      )}
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className="w-full resize-none px-4 py-3 text-sm font-[900] lowercase text-foreground focus:outline-none transition-colors"
        style={{ borderRadius: 16, border: "2px solid #222", backgroundColor: "#111111", caretColor: "hsl(var(--foreground))" }}
      />
      {!value && placeholder}
    </div>
  );
};

/* ── Create button component (reusable for top + bottom) ── */
const CreateButton = ({ onClick, disabled, isGenerating }: {
  onClick: () => void; disabled: boolean; isGenerating: boolean;
}) => (
  <button
    className="w-full h-14 text-sm font-[900] lowercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
    style={{ backgroundColor: "#facc15", color: "#000", borderRadius: 12 }}
    onClick={onClick}
    disabled={disabled}
  >
    {isGenerating ? (
      <><Loader2 className="animate-spin" size={18} />creating...</>
    ) : (
      <>create · 1 💎</>
    )}
  </button>
);

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { credits, gems, refetch: refetchCredits } = useCredits();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/create", { replace: true });
    }
  }, [authLoading, user, navigate]);
  const [searchParams] = useSearchParams();
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharId, setSelectedCharId] = useState("");
  const [photoOverlayPhase, setPhotoOverlayPhase] = useState<"hidden" | "loading" | "success">("hidden");
  const [photoOverlayResult, setPhotoOverlayResult] = useState<string | null>(null);
  const [fadingBack, setFadingBack] = useState(false);

  const [photoType, setPhotoType] = useState("selfie");
  const [photoRatio, setPhotoRatio] = useState("3:4");

  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [referenceStrength, setReferenceStrength] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedChar = useMemo(() => characters.find((c) => c.id === selectedCharId), [characters, selectedCharId]);
  const placeholder = useCyclingPlaceholder(selectedChar?.name || "luna");

  useEffect(() => {
    const handler = () => {
      setFadingBack(true);
      setTimeout(() => {
        setPhotoOverlayPhase("hidden");
        setFadingBack(false);
        navigate("/storage");
      }, 100);
    };
    window.addEventListener("photo-overlay-dismiss", handler);
    return () => window.removeEventListener("photo-overlay-dismiss", handler);
  }, [navigate]);

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
          if (char) setSelectedCharId(preselectedCharacterId);
        }
      }
    };
    fetchCharacters();
  }, [user, preselectedCharacterId]);

  const handleCharacterSelect = (charId: string) => {
    setSelectedCharId(charId);
    setPrompt("");
  };

  const previewAspect = photoRatio === "9:16" ? "9/16" : "3/4";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReferenceImage(URL.createObjectURL(file));
  };

  const handleCreate = async () => {
    if (!user) { navigate(`/auth?redirect=${encodeURIComponent("/create")}`); return; }
    if (credits <= 0) { setShowPaywall(true); return; }
    if (!prompt.trim()) { toast.error("describe your photo first"); return; }

    setIsGenerating(true);
    setError("");
    setPhotoOverlayPhase("loading");
    setPhotoOverlayResult(null);

    toast("1 gem used");
    const cleanPrompt = sanitiseText(prompt.trim());

    // Upload vibe reference image to storage if present
    let vibeRefUrl: string | null = null;
    if (referenceImage && fileInputRef.current?.files?.[0]) {
      try {
        const file = fileInputRef.current.files[0];
        const filename = `${user.id}/vibe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${file.name.split('.').pop() || 'png'}`;
        const { error: uploadErr } = await supabase.storage.from("images").upload(filename, file, { contentType: file.type, upsert: false });
        if (!uploadErr) {
          const { data: pubData } = supabase.storage.from("images").getPublicUrl(filename);
          vibeRefUrl = pubData.publicUrl;
        }
      } catch (e) {
        console.error("Vibe reference upload failed:", e);
      }
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate", {
        body: {
          prompt: cleanPrompt,
          character_id: selectedCharId || undefined,
          photo_type: photoType,
          aspect_ratio: photoRatio,
          ...(vibeRefUrl ? { vibe_reference_url: vibeRefUrl } : {}),
        },
      });
      if (fnError) throw fnError;
      if (data?.error) {
        if (data?.code === "CONTENT_POLICY") {
          toast.error("please adjust your description and try again");
          setPhotoOverlayPhase("hidden");
          return;
        }
        if (data?.code === "NO_GEMS") {
          setPhotoOverlayPhase("hidden");
          setShowPaywall(true);
          return;
        }
        throw new Error(data.error);
      }

      const generatedUrl = (data.images || [])[0] || null;

      setPhotoOverlayResult(generatedUrl);
      setPhotoOverlayPhase("success");
      setResultImage(generatedUrl);

      await refetchCredits();
    } catch (e: any) {
      setPhotoOverlayPhase("hidden");
      if (e.message?.includes("No gems") || e.message?.includes("402")) {
        setShowPaywall(true);
      } else {
        toast.error("generation failed, please try again");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const createDisabled = isGenerating || (!!user && !prompt.trim());

  return (
    <div className="relative min-h-screen bg-background overflow-hidden">
      <DotDecal />
      <PhotoGenerationOverlay
        open={photoOverlayPhase !== "hidden"}
        phase={photoOverlayPhase === "hidden" ? "loading" : photoOverlayPhase}
        phrases={PHOTO_LOADING_PHRASES}
        resultImageUrl={photoOverlayResult}
      />
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <main className="relative z-[1] w-full max-w-lg md:max-w-4xl mx-auto px-[14px] md:px-10 pt-1 pb-[400px]">
        <div className="flex items-center gap-3 mb-4">
          <BackButton />
          <PageTitle className="mb-0">create photo</PageTitle>
        </div>

        {/* Desktop: two-column layout */}
        <div className="md:grid md:grid-cols-5 md:gap-8">
          {/* Left: preview */}
          <div className="md:col-span-2">
            <div className="relative flex justify-center">
                <motion.section
                layout
                className="mb-4 md:mb-0 flex items-center justify-center overflow-hidden"
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  borderRadius: 16,
                  border: "2px solid rgba(255,255,255,0.08)",
                  backgroundColor: "#111111",
                }}
                transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
              >
                <motion.div layout className="w-full" style={{ aspectRatio: previewAspect }}>
                  {resultImage ? (
                    <img src={resultImage} alt="generated photo" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <div
                        className="flex items-center justify-center rounded-full"
                        style={{
                          width: 72,
                          height: 72,
                          backgroundColor: "rgba(250,204,21,0.08)",
                          border: "2.5px solid #facc15",
                        }}
                      >
                        <span className="text-3xl">🪄</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              </motion.section>
            </div>
          </div>
          {/* Right: controls */}
          <div className="md:col-span-3 space-y-8">
            {/* Character select — always visible */}
            <div className="relative">
              <div className="absolute inset-0 -m-2 rounded-2xl" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: -1 }} />
              <span className="block text-xs font-[900] lowercase mb-1.5 text-white">select character</span>
              <label className="relative block">
                <select
                  value={selectedCharId}
                  onChange={(e) => handleCharacterSelect(e.target.value)}
                  className="h-12 w-full appearance-none px-4 pr-10 text-sm font-[900] lowercase text-foreground outline-none transition-colors"
                  style={{ borderRadius: 16, border: "2px solid #222", backgroundColor: "#111111" }}
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
                  onClick={() => {
                    sessionStorage.removeItem("vizura_creator_dismissed");
                    sessionStorage.removeItem("vizura_guided_flow_state");
                    navigate("/", { state: { openCreator: true } });
                  }}
                  className="mt-1.5 text-[10px] font-extrabold lowercase text-neon-yellow hover:opacity-80 transition-colors"
                >
                  create your first character →
                </button>
              )}
            </div>

            <div className="relative">
              <div className="absolute inset-0 -m-2 rounded-2xl" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: -1 }} />
              <div className="flex gap-6">
              <PillToggle label="type" options={["selfie", "photo"]} value={photoType} onChange={setPhotoType} />
              <PillToggle
                label="ratio"
                options={["3:4", "9:16"]}
                value={photoRatio}
                onChange={setPhotoRatio}
              />
              </div>
            </div>

            {/* Prompt */}
            <div className="relative">
              <div className="absolute inset-0 -m-2 rounded-2xl" style={{ backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", zIndex: -1 }} />
              <span className="block text-xs font-[900] lowercase mb-1.5 text-white">describe your photo</span>
              <HighlightedPromptArea
                value={prompt}
                onChange={setPrompt}
                charName={selectedChar?.name || ""}
                placeholder={
                  <div className="pointer-events-none absolute left-4 top-3 right-4">
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
                }
              />
            </div>

            {/* Reference section */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-[900] lowercase text-white">add a reference image</span>
                <span className="text-xs font-[900] lowercase" style={{ color: "rgba(255,255,255,0.35)" }}>(optional)</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
              {referenceImage ? (
                <div className="flex items-center gap-3 px-4 py-2.5" style={{ borderRadius: 12, border: "2px solid #222", backgroundColor: "#111111" }}>
                  <img src={referenceImage} alt="Reference" className="h-10 w-10 rounded-lg object-cover shrink-0" />
                  <span className="text-xs font-[900] lowercase text-foreground/60 truncate flex-1">reference.jpg</span>
                  <button
                    type="button"
                    onClick={() => setReferenceImage(null)}
                    className="text-foreground/40 hover:text-foreground text-sm font-bold shrink-0"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex w-full items-center gap-3 px-4 py-3 hover:border-foreground/30 transition-colors"
                  style={{ borderRadius: 12, border: "2px dashed rgba(255,255,255,0.15)", backgroundColor: "#111111" }}
                >
                  <Upload size={16} strokeWidth={2.5} className="text-foreground/30 shrink-0" />
                  <span className="text-xs font-[900] lowercase text-foreground/30">upload image</span>
                </button>
              )}
              <div className="mt-4 flex items-center justify-between">
                <span className="text-[10px] font-[900] lowercase text-white">strength</span>
                <span className="text-[10px] font-[900] lowercase text-white">{referenceStrength}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={referenceStrength}
                onChange={(e) => setReferenceStrength(Number(e.target.value))}
                className="mt-1.5 w-full cursor-pointer appearance-none rounded-full h-2"
                style={{ background: `linear-gradient(to right, hsl(var(--neon-yellow)) ${referenceStrength}%, hsl(var(--secondary)) ${referenceStrength}%)` }}
              />
            </div>

            {/* Create button */}
            <div className="pt-2">
              <CreateButton onClick={handleCreate} disabled={createDisabled} isGenerating={isGenerating} />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border-[5px] border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive">
            {error}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
