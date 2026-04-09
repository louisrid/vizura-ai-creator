import { useEffect, useState, useRef, useMemo, Fragment } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Loader2, Zap, Sparkles, ChevronDown, Gem, User } from "lucide-react";
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
      className="flex items-center rounded-2xl border-2 border-input bg-card p-1.5"
    >
      {options.map((opt, i) => {
        const isSelected = value === opt;

        return (
          <Fragment key={opt}>
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(opt)}
              className="flex-1 flex items-center justify-center rounded-2xl px-0 py-[10px] text-[15px] font-extrabold lowercase transition-all"
              style={isSelected
                ? {
                    backgroundColor: "hsl(var(--neon-yellow))",
                    color: "hsl(var(--neon-yellow-foreground))",
                    boxShadow: "0 0 0 2px hsl(var(--neon-yellow) / 0.22) inset",
                  }
                : {
                    backgroundColor: "transparent",
                    color: "hsl(var(--foreground) / 0.48)",
                  }}
            >
              {opt}
            </button>
            {i < options.length - 1 && (
              <div
                aria-hidden
                className="mx-1.5 h-[34px] w-px shrink-0 self-center bg-foreground/30"
              />
            )}
          </Fragment>
        );
      })}
    </div>
  </div>
);

/* ── Static placeholder — tells user what to type ── */
const useStaticPlaceholder = (charName: string) => {
  const name = charName || "sara";
  return `e.g. ${name} standing in her bedroom wearing a pink hoodie`;
};

const escapeHtml = (text: string) =>
  text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");

/* ── Highlighted text input — normal textarea, mirrored overlay ── */
const HighlightedPromptArea = ({
  value, onChange, charName, placeholder
}: {
  value: string; onChange: (v: string) => void; charName: string;
  placeholder: React.ReactNode;
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);

  const highlightedHtml = useMemo(() => {
    if (!value) return "";

    if (!charName.trim()) return escapeHtml(value);

    const escapedName = charName.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[\\s,.\\/!?;:\\-])(${escapedName})(?=[\\s,.\\/!?;:\\-]|$)`, "gi");
    const parts: string[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(value)) !== null) {
      const boundary = match[1] ?? "";
      const name = match[2] ?? "";
      const matchStart = match.index;
      const highlightStart = matchStart + boundary.length;
      const highlightEnd = highlightStart + name.length;

      if (lastIndex < matchStart) {
        parts.push(escapeHtml(value.slice(lastIndex, matchStart)));
      }

      if (boundary) {
        parts.push(escapeHtml(boundary));
      }

      parts.push(`<span style="color:hsl(var(--neon-yellow));">${escapeHtml(name)}</span>`);
      lastIndex = highlightEnd;
    }

    if (lastIndex < value.length) {
      parts.push(escapeHtml(value.slice(lastIndex)));
    }

    return parts.join("");
  }, [value, charName]);

  return (
    <div className="relative overflow-hidden rounded-2xl border-2 border-input bg-card">
      <div
        ref={overlayRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden whitespace-pre-wrap break-words px-4 py-3 text-2xl font-[900] lowercase text-foreground"
        dangerouslySetInnerHTML={{ __html: highlightedHtml || "&nbsp;" }}
      />
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={(e) => {
          if (overlayRef.current) {
            overlayRef.current.scrollTop = e.currentTarget.scrollTop;
            overlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
          }
        }}
        spellCheck={false}
        autoCorrect="off"
        className="relative z-[1] w-full min-h-[176px] resize-none bg-transparent px-4 py-3 text-2xl font-[900] lowercase whitespace-pre-wrap break-words text-transparent focus:outline-none"
        style={{
          caretColor: "hsl(var(--foreground))",
          WebkitTextFillColor: "transparent",
        }}
      />
      {!value && placeholder}
    </div>
  );
};

/* ── Expression options ── */
const EXPRESSION_OPTIONS = [
  { value: "casual smile", label: "casual smile 😊" },
  { value: "straight face", label: "straight face 😐" },
  { value: "big smile", label: "big smile 😁" },
  { value: "pout", label: "pout 😘" },
] as const;

/* ── Expression dropdown (custom, matching character selector style) ── */
const ExpressionDropdown = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = EXPRESSION_OPTIONS.find((o) => o.value === value) ?? EXPRESSION_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div>
      <span className="block text-base font-[900] lowercase mb-2 text-white">expression</span>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 h-14 px-4 transition-colors active:scale-[0.99]"
          style={{ borderRadius: 12, backgroundColor: "#111111", border: "2px solid #222" }}
        >
          <span className="flex-1 text-left text-base font-[900] lowercase text-foreground">{selected.label}</span>
          <ChevronDown
            size={18}
            strokeWidth={2.5}
            className={`text-foreground/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden"
              style={{ borderRadius: 12, border: "2px solid #222", backgroundColor: "#0a0a0a" }}
            >
              {EXPRESSION_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  className={`flex w-full items-center px-4 py-3 transition-colors text-base font-[900] lowercase ${value === opt.value ? "bg-white/5" : "hover:bg-white/5"}`}
                  style={{ color: value === opt.value ? "#facc15" : "#fff" }}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ── Create button component ── */
const CreateButton = ({ onClick, disabled, isGenerating }: {
  onClick: () => void; disabled: boolean; isGenerating: boolean;
}) => (
  <button
    className="w-full h-14 text-xl font-[900] lowercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
    style={{ backgroundColor: "#050a10", color: "#00e0ff", border: "2px solid #00e0ff", borderRadius: 12 }}
    onClick={onClick}
    disabled={disabled}
  >
    {isGenerating ? (
      <><Loader2 className="animate-spin" size={18} />creating...</>
    ) : (
      <>create · 1 <Gem size={14} strokeWidth={2.5} style={{ color: "#00e0ff" }} /></>
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
  const preselectedCharacterId = (location.state as any)?.preselectedCharacterId;
  const persistedCharacterId = typeof window !== "undefined" ? sessionStorage.getItem("vizura_last_selected_character_id") ?? "" : "";
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharId, setSelectedCharId] = useState(preselectedCharacterId || persistedCharacterId || "");
  const [photoOverlayPhase, setPhotoOverlayPhase] = useState<"hidden" | "loading" | "success">("hidden");
  const [photoOverlayResult, setPhotoOverlayResult] = useState<string | null>(null);
  const [fadingBack, setFadingBack] = useState(false);

  const [photoType, setPhotoType] = useState("selfie");
  const [photoRatio, setPhotoRatio] = useState("3:4");
  const [expression, setExpression] = useState("casual smile");

  const [charDropdownOpen, setCharDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedChar = useMemo(() => characters.find((c) => c.id === selectedCharId), [characters, selectedCharId]);
  const placeholderText = useStaticPlaceholder(selectedChar?.name || "luna");

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
        navigate("/storage", { replace: true });
      }, 100);
    };
    window.addEventListener("photo-overlay-dismiss", handler);
    return () => window.removeEventListener("photo-overlay-dismiss", handler);
  }, [navigate]);

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
        // Always select the most recently created character (first in list)
        const latestId = data[0]?.id;
        if (latestId) {
          setSelectedCharId(latestId);
          sessionStorage.setItem("vizura_last_selected_character_id", latestId);
        }
      }
    };
    fetchCharacters();
  }, [user]);

  const handleCharacterSelect = (charId: string) => {
    setSelectedCharId(charId);
    sessionStorage.setItem("vizura_last_selected_character_id", charId);
    setPrompt("");
  };

  const previewAspect = photoRatio === "9:16" ? "9/16" : "3/4";

  const handleCreate = async () => {
    if (!user) { navigate(`/auth?redirect=${encodeURIComponent("/create")}`); return; }
    if (credits <= 0) { setShowPaywall(true); return; }
    if (!selectedCharId || !prompt.trim()) { toast.error("finish info!"); return; }

    setIsGenerating(true);
    setError("");
    setPhotoOverlayPhase("loading");
    setPhotoOverlayResult(null);

    toast("1 gem used");
    const cleanPrompt = sanitiseText(prompt.trim());

    try {
      const { data, error: fnError } = await supabase.functions.invoke("generate", {
        body: {
          prompt: cleanPrompt,
          character_id: selectedCharId || undefined,
          photo_type: photoType,
          aspect_ratio: photoRatio,
          expression: expression || undefined,
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

  const createDisabled = isGenerating;

  return (
    <div className="relative min-h-screen bg-background overflow-x-hidden">
      <DotDecal />
      <PhotoGenerationOverlay
        open={photoOverlayPhase !== "hidden"}
        phase={photoOverlayPhase === "hidden" ? "loading" : photoOverlayPhase}
        phrases={PHOTO_LOADING_PHRASES}
        resultImageUrl={photoOverlayResult}
      />
      <PaywallOverlay open={showPaywall} onClose={() => setShowPaywall(false)} />

      <main className="relative z-[1] w-full max-w-lg mx-auto px-[14px] pt-6 pb-[250px]">
        <div className="flex items-center gap-3 mb-7">
          <BackButton />
          <PageTitle className="mb-0">create photo</PageTitle>
        </div>

        <div className="flex flex-col gap-7">

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

          {/* Expression dropdown */}
          <ExpressionDropdown value={expression} onChange={setExpression} />

          {/* Prompt */}
          <div className="relative">
            <span className="block text-sm font-[900] lowercase mb-2 text-white">describe your photo</span>
            <HighlightedPromptArea
              value={prompt}
              onChange={setPrompt}
              charName={selectedChar?.name || ""}
              placeholder={
                <div className="pointer-events-none absolute left-4 top-3 right-4">
                  <span className="text-2xl font-extrabold lowercase text-foreground/30">
                    {placeholderText}
                  </span>
                </div>
              }
            />
          </div>

          {/* Create button */}
          <div className="pt-3">
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
