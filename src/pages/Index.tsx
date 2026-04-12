import { useEffect, useState, useRef, useMemo, Fragment } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { Loader2, ChevronDown, Gem, User } from "lucide-react";
import ImageZoomViewer from "@/components/ImageZoomViewer";
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

/* ── Toggle box ── */
const ToggleBox = ({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) => (
  <div className="flex-1 flex flex-col gap-2">
    <span className="text-lg md:text-xl font-[900] lowercase text-white">{label}</span>
    <div className="flex items-stretch rounded-[10px] border-2 border-[rgba(255,255,255,0.15)] overflow-hidden" style={{ backgroundColor: "#1a1a1a" }}>
      {options.map((opt, i) => {
        const isSelected = value === opt;
        const isFirst = i === 0;
        const isLast = i === options.length - 1;
        return (
          <Fragment key={opt}>
            {i > 0 && (
              <div aria-hidden className="w-px shrink-0 self-stretch" style={{ backgroundColor: "rgba(255,255,255,0.12)" }} />
            )}
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(opt)}
              className="flex-1 flex items-center justify-center px-0 py-[12px] md:py-[14px] text-[16px] md:text-[17px] font-[900] lowercase transition-all"
              style={{
                backgroundColor: isSelected ? "#ffe603" : "transparent",
                color: isSelected ? "#000" : "rgba(255,255,255,0.4)",
                borderRadius: isFirst && isLast ? "10px" : isFirst ? "10px 0 0 10px" : isLast ? "0 10px 10px 0" : "0",
              }}
            >
              {opt}
            </button>
          </Fragment>
        );
      })}
    </div>
  </div>
);

/* ── Static placeholder ── */
const useStaticPlaceholder = (charName: string) => {
  const name = charName || "sara";
  return `e.g. ${name} standing in her bedroom wearing a pink hoodie`;
};

const escapeHtml = (text: string) =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");

/* ── Highlighted text input ── */
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
      if (lastIndex < matchStart) parts.push(escapeHtml(value.slice(lastIndex, matchStart)));
      if (boundary) parts.push(escapeHtml(boundary));
      parts.push(`<span style="color:hsl(var(--neon-yellow));">${escapeHtml(name)}</span>`);
      lastIndex = highlightEnd;
    }
    if (lastIndex < value.length) parts.push(escapeHtml(value.slice(lastIndex)));
    return parts.join("");
  }, [value, charName]);

  return (
    <div className="relative overflow-hidden rounded-[10px] border-2 border-input bg-card">
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
        className="relative z-[1] w-full min-h-[176px] md:min-h-[200px] resize-none bg-transparent px-4 py-3 text-2xl font-[900] lowercase whitespace-pre-wrap break-words text-transparent focus:outline-none"
        style={{ caretColor: "hsl(var(--foreground))", WebkitTextFillColor: "transparent" }}
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

/* ── Expression dropdown ── */
const ExpressionDropdown = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = EXPRESSION_OPTIONS.find((o) => o.value === value) ?? EXPRESSION_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [open]);

  return (
    <div>
      <span className="block text-lg md:text-xl font-[900] lowercase mb-2 text-white">expression</span>
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex w-full items-center gap-3 h-14 md:h-16 px-4 transition-colors active:scale-[0.99]"
          style={{ borderRadius: 10, backgroundColor: "#1a1a1a", border: "2px solid rgba(255,255,255,0.15)" }}
        >
          <span className="flex-1 text-left text-base md:text-lg font-[900] lowercase text-foreground">{selected.label}</span>
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
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden"
              style={{ borderRadius: 10, border: "2px solid rgba(255,255,255,0.15)", backgroundColor: "#000000", boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }}
            >
              {EXPRESSION_OPTIONS.map((opt, idx) => (
                <div key={opt.value}>
                  {idx > 0 && <div style={{ height: 1, backgroundColor: "#1a1a1a", margin: "0" }} />}
                  <button
                    type="button"
                    onClick={() => { onChange(opt.value); setOpen(false); }}
                    className="flex w-full items-center px-4 py-3 transition-colors text-base font-[900] lowercase"
                    style={{
                      color: value === opt.value ? "#ffe603" : "#fff",
                      backgroundColor: value === opt.value ? "rgba(255,255,255,0.07)" : "transparent",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = value === opt.value ? "rgba(255,255,255,0.07)" : "transparent")}
                  >
                    {opt.label}
                  </button>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

/* ── Create button ── */
const CreateButton = ({ onClick, disabled, isGenerating }: {
  onClick: () => void; disabled: boolean; isGenerating: boolean;
}) => (
  <button
    className="w-full h-14 md:h-16 text-xl md:text-2xl font-[900] lowercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
    style={{ backgroundColor: "#050a10", color: "#ffffff", border: "2px solid #00e0ff", borderRadius: 10 }}
    onClick={onClick}
    disabled={disabled}
  >
    {isGenerating ? (
      <><Loader2 className="animate-spin" size={18} />creating...</>
    ) : (
      <>create <span style={{ color: "#00e0ff" }}>·</span> 1 <Gem size={14} strokeWidth={2.5} style={{ color: "#00e0ff" }} /></>
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
  const [prompt, setPrompt] = useState(() => sessionStorage.getItem("vizura_photo_prompt") || "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(() => sessionStorage.getItem("vizura_photo_result") || null);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharId, setSelectedCharId] = useState(preselectedCharacterId || persistedCharacterId || "");
  const cachedOverlay = sessionStorage.getItem("vizura_photo_overlay");
  const [photoOverlayPhase, setPhotoOverlayPhase] = useState<"hidden" | "loading" | "success">(cachedOverlay === "success" ? "success" : "hidden");
  const [photoOverlayResult, setPhotoOverlayResult] = useState<string | null>(() => cachedOverlay === "success" ? sessionStorage.getItem("vizura_photo_result") : null);
  const [fadingBack, setFadingBack] = useState(false);

  const [photoType, setPhotoType] = useState(() => sessionStorage.getItem("vizura_photo_type") || "selfie");
  const [photoRatio, setPhotoRatio] = useState(() => sessionStorage.getItem("vizura_photo_ratio") || "3:4");
  const [expression, setExpression] = useState(() => sessionStorage.getItem("vizura_photo_expression") || "casual smile");

  const [charDropdownOpen, setCharDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownRef2 = useRef<HTMLDivElement>(null);
  const charToggleRef = useRef<HTMLButtonElement>(null);
  const charToggleRef2 = useRef<HTMLButtonElement>(null);

  const selectedChar = useMemo(() => characters.find((c) => c.id === selectedCharId), [characters, selectedCharId]);
  const placeholderText = useStaticPlaceholder(selectedChar?.name || "luna");

  useEffect(() => {
    if (!charDropdownOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      // Check both mobile and desktop refs
      const inDropdown1 = dropdownRef.current?.contains(target);
      const inDropdown2 = dropdownRef2.current?.contains(target);
      if (!inDropdown1 && !inDropdown2) {
        setCharDropdownOpen(false);
      }
    };
    // Use pointerdown with a slight delay to avoid race with the toggle onClick
    const wrappedHandler = (e: PointerEvent) => handler(e as unknown as MouseEvent);
    document.addEventListener("pointerdown", wrappedHandler, true);
    return () => document.removeEventListener("pointerdown", wrappedHandler, true);
  }, [charDropdownOpen]);

  useEffect(() => {
    const handler = () => {
      setPhotoOverlayPhase("hidden");
      setFadingBack(false);
      // Clear cached overlay state
      try {
        sessionStorage.removeItem("vizura_photo_overlay");
      } catch {}
      // Scroll to top of the page where the new image sits
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    window.addEventListener("photo-overlay-dismiss", handler);
    return () => window.removeEventListener("photo-overlay-dismiss", handler);
  }, [navigate]);

  useEffect(() => {
    if (searchParams.get("upgrade") === "true") setShowPaywall(true);
  }, [searchParams]);

  // Listen for copied prompts from Storage page
  useEffect(() => {
    const syncCopiedPrompt = () => {
      try {
        const copiedPrompt = localStorage.getItem("vizura_copied_prompt");
        const copiedTsRaw = localStorage.getItem("vizura_copied_prompt_ts");
        const appliedTsRaw = sessionStorage.getItem("vizura_applied_copied_prompt_ts");

        if (!copiedPrompt || !copiedTsRaw) return;

        const copiedTs = Number(copiedTsRaw);
        const appliedTs = Number(appliedTsRaw || "0");

        if (!Number.isFinite(copiedTs) || copiedTs <= appliedTs) return;

        setPrompt(copiedPrompt);
        sessionStorage.setItem("vizura_photo_prompt", copiedPrompt);
        sessionStorage.setItem("vizura_applied_copied_prompt_ts", String(copiedTs));
      } catch {}
    };

    const handler = (e: StorageEvent) => {
      if (e.key === "vizura_copied_prompt" || e.key === "vizura_copied_prompt_ts") {
        syncCopiedPrompt();
      }
    };

    syncCopiedPrompt();
    window.addEventListener("storage", handler);
    window.addEventListener("focus", syncCopiedPrompt);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("focus", syncCopiedPrompt);
    };
  }, []);

  useEffect(() => {
    const fetchCharacters = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("characters")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (data && data.length > 0) {
        setCharacters(data as Character[]);
        // Priority: preselected > last used (persisted) > most recent
        const persisted = sessionStorage.getItem("vizura_last_selected_character_id") ?? "";
        const validPersisted = data.some((c: any) => c.id === persisted);
        const pickId = preselectedCharacterId && data.some((c: any) => c.id === preselectedCharacterId)
          ? preselectedCharacterId
          : validPersisted
            ? persisted
            : data[0].id;
        setSelectedCharId(pickId);
        sessionStorage.setItem("vizura_last_selected_character_id", pickId);
      } else if (data) {
        setCharacters([]);
      }
    };
    fetchCharacters();
  }, [user, preselectedCharacterId]);

  const handleCharacterSelect = (charId: string) => {
    setSelectedCharId(charId);
    sessionStorage.setItem("vizura_last_selected_character_id", charId);
    setPrompt("");
  };

  const previewAspect = photoRatio === "9:16" ? "9/16" : "3/4";

  const handleCreate = async () => {
    if (!user) { navigate(`/auth?redirect=${encodeURIComponent("/create")}`); return; }
    if (credits <= 0) { setShowPaywall(true); return; }
    if (!selectedCharId || !prompt.trim()) { toast.error("please fill all boxes"); return; }

    setIsGenerating(true);
    setError("");
    setResultImage(null);
    setPhotoOverlayPhase("loading");
    setPhotoOverlayResult(null);

    toast("1 gem used");
    const userPrompt = prompt;

    try {
      const controller = new AbortController();
      // 3-minute timeout to survive tab-backgrounding
      const timeout = setTimeout(() => controller.abort(), 180_000);

      let data: any;
      let fnError: any;
      try {
        const result = await supabase.functions.invoke("generate", {
          body: {
            prompt: userPrompt,
            character_id: selectedCharId || undefined,
            photo_type: photoType,
            aspect_ratio: photoRatio,
            expression: expression || undefined,
          },
        });
        data = result.data;
        fnError = result.error;
      } finally {
        clearTimeout(timeout);
      }

      if (fnError) {
        const msg = typeof fnError === "object" && fnError.message ? fnError.message : String(fnError);
        throw new Error(msg);
      }
      if (data?.error) {
        if (data?.code === "CONTENT_POLICY") {
          toast("prompt not allowed — try a different description");
          setPhotoOverlayPhase("hidden");
          await refetchCredits();
          return;
        }
        if (data?.code === "NO_GEMS") {
          setPhotoOverlayPhase("hidden");
          setShowPaywall(true);
          return;
        }
        if (data?.code === "RATE_LIMITED") {
          toast.error("too many requests — wait a moment and try again");
          setPhotoOverlayPhase("hidden");
          return;
        }
        throw new Error(data.error);
      }

      const generatedUrl = (data.images || [])[0] || null;
      if (!generatedUrl) {
        throw new Error("no image returned — the AI may have rejected this prompt");
      }

      setPhotoOverlayResult(generatedUrl);
      setPhotoOverlayPhase("success");
      setResultImage(generatedUrl);
      // Cache for refresh persistence
      try {
        sessionStorage.setItem("vizura_photo_result", generatedUrl);
        sessionStorage.setItem("vizura_photo_overlay", "success");
        sessionStorage.setItem("vizura_photo_prompt", prompt);
      } catch {}

      await refetchCredits();
    } catch (e: any) {
      console.error("Photo generation error:", e);
      setPhotoOverlayPhase("hidden");

      const msg = e?.message || String(e);
      if (msg.includes("No gems") || msg.includes("402")) {
        setShowPaywall(true);
      } else if (msg.includes("abort") || msg.includes("AbortError")) {
        toast.error("request timed out — please try again");
      } else if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("network")) {
        toast.error("network error — check your connection and try again");
      } else if (msg.includes("content policy") || msg.includes("safety") || msg.includes("blocked")) {
        toast.error("prompt not allowed — try a different description");
      } else {
        toast.error("server error, please try again");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const createDisabled = isGenerating;

  /* ── Character dropdown content (shared between mobile/desktop) ── */
  const charDropdownContent = (
    <AnimatePresence>
      {charDropdownOpen && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden"
          style={{ borderRadius: 10, border: "2px solid rgba(255,255,255,0.15)", backgroundColor: "#000000", boxShadow: "0 8px 32px rgba(0,0,0,0.8)" }}
        >
          {characters.map((c, idx) => {
            const isFirst = idx === 0;
            const isLast = idx === characters.length - 1 && !(characters.length === 0 && user);
            const isSelected = selectedCharId === c.id;
            const borderRadius = isFirst && isLast ? "10px" : isFirst ? "10px 10px 0 0" : isLast ? "0 0 10px 10px" : "0";
            return (
              <Fragment key={c.id}>
                {idx > 0 && <div style={{ height: 1, backgroundColor: "#1a1a1a", margin: "0" }} />}
                <button
                  type="button"
                  onClick={() => { handleCharacterSelect(c.id); setCharDropdownOpen(false); }}
                  className="flex w-full items-center gap-3 px-4 py-3 transition-colors duration-150"
                  style={{
                    backgroundColor: isSelected ? "rgba(255,255,255,0.07)" : "transparent",
                    borderRadius,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = isSelected ? "rgba(255,255,255,0.07)" : "transparent")}
                >
                  {c.face_image_url ? (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden shrink-0 border border-white/10">
                      <img src={c.face_image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: "#1a1a1a" }}>
                      <User size={16} strokeWidth={3} style={{ color: "rgba(255,255,255,0.3)" }} />
                    </div>
                  )}
                  <span
                    className="text-lg font-[900] lowercase truncate"
                    style={{ color: isSelected ? "#ffe603" : "#fff" }}
                  >
                    {c.name || "unnamed"}
                  </span>
                </button>
              </Fragment>
            );
          })}
          {characters.length === 0 && user && (
            <Fragment>
              <button
                type="button"
                onClick={() => {
                  setCharDropdownOpen(false);
                  sessionStorage.removeItem("vizura_creator_dismissed");
                  sessionStorage.removeItem("vizura_guided_flow_state");
                  navigate("/", { state: { openCreator: true } });
                }}
                className="flex w-full items-center gap-3 px-4 py-3 transition-colors duration-150"
                style={{ borderRadius: "10px" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: "rgba(250,204,21,0.1)", border: "2px solid rgba(250,204,21,0.3)" }}>
                  <span className="text-xs">+</span>
                </div>
                <span className="text-lg font-[900] lowercase" style={{ color: "#ffe603" }}>create character</span>
              </button>
            </Fragment>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );

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

      {/* Mobile layout */}
      <main className="relative z-[1] w-full max-w-lg mx-auto px-[14px] pt-10 pb-[90px] md:hidden">
        <div className="flex items-center gap-3 mb-7">
          <BackButton />
          <PageTitle className="mb-0">create photo</PageTitle>
        </div>

        <div className="flex flex-col gap-7">
          <div className="w-[75%] mx-auto flex flex-col gap-5">
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setCharDropdownOpen((v) => !v)}
                className="flex w-full items-center gap-3 h-14 px-4 transition-colors active:scale-[0.99]"
                style={{ borderRadius: 10, backgroundColor: "#ffe603" }}
              >
                {selectedChar?.face_image_url ? (
                  <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border-2 border-black/15">
                    <img src={selectedChar.face_image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.1)" }}>
                    <User size={18} strokeWidth={3} style={{ color: "rgba(0,0,0,0.4)" }} />
                  </div>
                )}
                <span className="flex-1 text-left text-xl font-[900] lowercase text-black truncate">
                  {selectedChar?.name || "select character"}
                </span>
                <ChevronDown size={18} strokeWidth={2.5} className={`text-black/40 transition-transform duration-200 ${charDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {charDropdownContent}
            </div>

            <motion.section
              layout
              className="flex items-center justify-center overflow-hidden w-full"
              style={{ borderRadius: 10, border: "2px solid rgba(255,255,255,0.15)", backgroundColor: "#1a1a1a" }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <motion.div layout className="w-full" style={{ aspectRatio: previewAspect }}>
                {resultImage ? (
                  <img
                    src={resultImage}
                    alt="generated photo"
                    className="h-full w-full object-cover cursor-pointer"
                    onClick={() => setExpandedImage(resultImage)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="flex items-center justify-center rounded-full" style={{ width: 48, height: 48, backgroundColor: "rgba(250,204,21,0.08)", border: "2px solid #ffe603" }}>
                      <span className="text-xl">🪄</span>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.section>
          </div>

          <div className="flex gap-3">
            <ToggleBox label="type" options={["selfie", "photo"]} value={photoType} onChange={(v) => { setPhotoType(v); sessionStorage.setItem("vizura_photo_type", v); }} />
            <ToggleBox label="ratio" options={["3:4", "9:16"]} value={photoRatio} onChange={(v) => { setPhotoRatio(v); sessionStorage.setItem("vizura_photo_ratio", v); }} />
          </div>

          <ExpressionDropdown value={expression} onChange={(v) => { setExpression(v); sessionStorage.setItem("vizura_photo_expression", v); }} />

          <div className="relative">
            <span className="block text-lg md:text-xl font-[900] lowercase mb-2 text-white">describe your photo</span>
            <HighlightedPromptArea
              value={prompt}
              onChange={(v) => {
                setPrompt(v);
                try { sessionStorage.setItem("vizura_photo_prompt", v); } catch {}
              }}
              charName={selectedChar?.name || ""}
              placeholder={
                <div className="pointer-events-none absolute left-4 top-3 right-4">
                  <span className="text-2xl font-extrabold lowercase text-foreground/30">{placeholderText}</span>
                </div>
              }
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-[10px] border-[2px] border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive">
            {error}
          </div>
        )}
      </main>

      {/* Desktop layout — two-column */}
      <main className="hidden md:block relative z-[1] w-full max-w-6xl mx-auto px-10 pt-10 pb-[280px]">
        <div className="flex items-center gap-3 mb-8">
          <BackButton />
          <PageTitle className="mb-0">create photo</PageTitle>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Left: preview + character selector */}
          <div className="col-span-5 flex flex-col gap-5">
            <div className="relative" ref={dropdownRef2}>
              <button
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setCharDropdownOpen((v) => !v)}
                className="flex w-full items-center gap-3 h-16 px-5 transition-colors active:scale-[0.99] hover-glow"
                style={{ borderRadius: 10, backgroundColor: "#ffe603" }}
              >
                {selectedChar?.face_image_url ? (
                  <div className="w-11 h-11 rounded-full overflow-hidden shrink-0 border-2 border-black/15">
                    <img src={selectedChar.face_image_url} alt="" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: "rgba(0,0,0,0.1)" }}>
                    <User size={20} strokeWidth={3} style={{ color: "rgba(0,0,0,0.4)" }} />
                  </div>
                )}
                <span className="flex-1 text-left text-xl font-[900] lowercase text-black truncate">
                  {selectedChar?.name || "select character"}
                </span>
                <ChevronDown size={20} strokeWidth={2.5} className={`text-black/40 transition-transform duration-200 ${charDropdownOpen ? "rotate-180" : ""}`} />
              </button>
              {charDropdownContent}
            </div>

            <motion.section
              layout
              className="flex items-center justify-center overflow-hidden w-full"
              style={{ borderRadius: 10, border: "2px solid rgba(255,255,255,0.15)", backgroundColor: "#1a1a1a" }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <motion.div layout className="w-full" style={{ aspectRatio: previewAspect }}>
                {resultImage ? (
                  <img
                    src={resultImage}
                    alt="generated photo"
                    className="h-full w-full object-cover cursor-pointer"
                    onClick={() => setExpandedImage(resultImage)}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="flex items-center justify-center rounded-full" style={{ width: 64, height: 64, backgroundColor: "rgba(250,204,21,0.08)", border: "2px solid #ffe603" }}>
                      <span className="text-2xl">🪄</span>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.section>
          </div>

          {/* Right: controls */}
          <div className="col-span-7 flex flex-col gap-6">
            <div className="flex gap-4">
              <ToggleBox label="type" options={["selfie", "photo"]} value={photoType} onChange={(v) => { setPhotoType(v); sessionStorage.setItem("vizura_photo_type", v); }} />
              <ToggleBox label="ratio" options={["3:4", "9:16"]} value={photoRatio} onChange={(v) => { setPhotoRatio(v); sessionStorage.setItem("vizura_photo_ratio", v); }} />
            </div>

            <ExpressionDropdown value={expression} onChange={(v) => { setExpression(v); sessionStorage.setItem("vizura_photo_expression", v); }} />

            <div className="relative">
              <span className="block text-lg md:text-xl font-[900] lowercase mb-2 text-white">describe your photo</span>
              <HighlightedPromptArea
                value={prompt}
                onChange={(v) => {
                  setPrompt(v);
                  try { sessionStorage.setItem("vizura_photo_prompt", v); } catch {}
                }}
                charName={selectedChar?.name || ""}
                placeholder={
                  <div className="pointer-events-none absolute left-4 top-3 right-4">
                    <span className="text-2xl font-extrabold lowercase text-foreground/30">{placeholderText}</span>
                  </div>
                }
              />
            </div>

            <CreateButton onClick={handleCreate} disabled={createDisabled} isGenerating={isGenerating} />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-[10px] border-[2px] border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive">
            {error}
          </div>
        )}
      </main>

      <ImageZoomViewer url={expandedImage} onClose={() => setExpandedImage(null)} />

      <div className="fixed left-0 right-0 bottom-0 z-10 px-[14px] md:hidden pointer-events-none" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)", background: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 25%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.3) 70%, transparent 100%)", paddingTop: 24 }}>
        <div className="mx-auto max-w-lg pointer-events-auto">
          <CreateButton onClick={handleCreate} disabled={createDisabled} isGenerating={isGenerating} />
        </div>
      </div>
    </div>
  );
};

export default Index;
