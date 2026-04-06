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

/* ── Toggle box (new design — contained in a rounded box with dividers) ── */
const ToggleBox = ({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) => (
  <div className="flex-1 flex flex-col gap-2">
    <span className="text-base font-[900] lowercase text-white">{label}</span>
    <div
      className="flex items-stretch p-1.5"
      style={{ borderRadius: 14, border: "2px solid #222", backgroundColor: "#111111" }}
    >
      {options.map((opt, i) => (
        <div key={opt} className="flex-1 flex items-stretch">
          {i > 0 && (
            <div className="w-[1px] my-1.5" style={{ backgroundColor: "rgba(255,255,255,0.1)" }} />
          )}
          <button
            type="button"
            onClick={() => onChange(opt)}
            className="flex-1 flex items-center justify-center transition-all"
            style={{
              borderRadius: 10,
              padding: "10px 0",
              fontSize: 15,
              fontWeight: 800,
              textTransform: "lowercase" as const,
              ...(value === opt
                ? { backgroundColor: "#facc15", color: "#000" }
                : { backgroundColor: "transparent", color: "rgba(255,255,255,0.45)" }
              ),
            }}
          >
            {opt}
          </button>
        </div>
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
        rows={6}
        spellCheck={false}
        autoCorrect="off"
        className="w-full resize-none px-4 py-3 text-lg font-[900] lowercase text-foreground focus:outline-none transition-colors"
        style={{ borderRadius: 16, border: "2px solid #222", backgroundColor: "#111111", caretColor: "hsl(var(--foreground))" }}
      />
      {!value && placeholder}
    </div>
  );
};

/* ── Create button component ── */
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [charDropdownOpen, setCharDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedChar = useMemo(() => characters.find((c) => c.id === selectedCharId), [characters, selectedCharId]);
  const placeholder = useCyclingPlaceholder(selectedChar?.name || "luna");

  useEffect(() => {
    if (!charDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setCharDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [charDropdownOpen]);

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
        if (preselectedCharacterId) {
          const char = data.find((c: any) => c.id === preselectedCharacterId);
          if (char) setSelectedCharId(preselectedCharacterId);
        } else if (data.length > 0) {
          setSelectedCharId(data[0].id);
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

      <main className="relative z-[1] w-full max-w-lg mx-auto px-[14px] pt-1 pb-40">
        <div className="flex items-center gap-3 mb-7">
          <BackButton />
          <PageTitle className="mb-0">create photo</PageTitle>
        </div>

        <div className="flex flex-col gap-6">

          {/* Character selector + Photo box — narrower (75%) */}
          <div className="w-[75%] mx-auto flex flex-col gap-5">
            {/* Character selector — yellow background */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setCharDropdownOpen((v) => !v)}
                className="flex w-full items-center gap-3 h-14 px-4 transition-colors active:scale-[0.99]"
                style={{ borderRadius: 12, backgroundColor: "#facc15" }}
              >
                {selectedChar?.face_image_url ? (
                  <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 border-black/15">
                    <img src={selectedChar.face_image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.1)" }}>
                    <span className="text-black/40 text-sm">👤</span>
                  </div>
                )}
                <span className="flex-1 text-left text-xl font-[900] lowercase text-black truncate">
                  {selectedChar?.name || "select character"}
                </span>
                <ChevronDown
                  size={18}
                  strokeWidth={2.5}
                  className={`text-black/40 transition-transform duration-200 ${charDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence>
                {charDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden"
                    style={{ borderRadius: 12, border: "2px solid #222", backgroundColor: "#0a0a0a" }}
                  >
                    {characters.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => { handleCharacterSelect(c.id); setCharDropdownOpen(false); }}
                        className={`flex w-full items-center gap-3 px-4 py-3 transition-colors ${selectedCharId === c.id ? "bg-white/5" : "hover:bg-white/5"}`}
                      >
                        {c.face_image_url ? (
                          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-white/10">
                            <img src={c.face_image_url} alt="" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: "#222" }}>
                            <span className="text-white/30 text-sm">👤</span>
                          </div>
                        )}
                        <span
                          className="text-lg font-[900] lowercase truncate"
                          style={{ color: selectedCharId === c.id ? "#facc15" : "#fff" }}
                        >
                          {c.name || "unnamed"}
                        </span>
                      </button>
                    ))}
                    {characters.length === 0 && user && (
                      <button
                        type="button"
                        onClick={() => {
                          setCharDropdownOpen(false);
                          sessionStorage.removeItem("vizura_creator_dismissed");
                          sessionStorage.removeItem("vizura_guided_flow_state");
                          navigate("/", { state: { openCreator: true } });
                        }}
                        className="flex w-full items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: "rgba(250,204,21,0.1)", border: "1px solid rgba(250,204,21,0.3)" }}>
                          <span className="text-xs">+</span>
                        </div>
                        <span className="text-lg font-[900] lowercase" style={{ color: "#facc15" }}>create character</span>
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Photo preview */}
            <motion.section
              layout
              className="flex items-center justify-center overflow-hidden w-full"
              style={{
                borderRadius: 14,
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
                        width: 48,
                        height: 48,
                        backgroundColor: "rgba(250,204,21,0.08)",
                        border: "2px solid #facc15",
                      }}
                    >
                      <span className="text-xl">🪄</span>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.section>
          </div>

          {/* Full-width controls below */}

          {/* Type & Ratio toggles — two separate boxes */}
          <div className="flex gap-3">
            <ToggleBox label="type" options={["selfie", "photo"]} value={photoType} onChange={setPhotoType} />
            <ToggleBox label="ratio" options={["3:4", "9:16"]} value={photoRatio} onChange={setPhotoRatio} />
          </div>

          {/* Prompt */}
          <div className="relative">
            <span className="block text-sm font-[900] lowercase mb-2 text-white">describe your photo</span>
            <HighlightedPromptArea
              value={prompt}
              onChange={setPrompt}
              charName={selectedChar?.name || ""}
              placeholder={
                <div className="pointer-events-none absolute left-4 top-3 right-4">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={placeholder.text}
                      className="text-lg font-extrabold lowercase text-foreground/30"
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
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-[900] lowercase text-white">add a reference image</span>
              <span className="text-sm font-[900] lowercase" style={{ color: "rgba(255,255,255,0.35)" }}>(optional)</span>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            {referenceImage ? (
              <div className="flex items-center gap-3 px-4 py-4" style={{ borderRadius: 12, border: "2px solid #222", backgroundColor: "#111111" }}>
                <img src={referenceImage} alt="Reference" className="h-12 w-12 rounded-lg object-cover shrink-0" />
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
                className="flex w-full items-center justify-center gap-3 px-4 py-6 hover:border-foreground/30 transition-colors"
                style={{ borderRadius: 12, border: "2px dashed rgba(255,255,255,0.15)", backgroundColor: "#111111" }}
              >
                <Upload size={18} strokeWidth={2.5} className="text-foreground/30 shrink-0" />
                <span className="text-sm font-[900] lowercase text-foreground/30">upload image</span>
              </button>
            )}
          </div>

          {/* Create button */}
          <div className="pt-2">
            <CreateButton onClick={handleCreate} disabled={createDisabled} isGenerating={isGenerating} />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-2xl border-[2px] border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive">
            {error}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
