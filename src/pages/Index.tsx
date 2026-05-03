import { useEffect, useState, useRef, useMemo, Fragment, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation, useSearchParams } from "react-router-dom";
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import { Loader2, ChevronDown, Gem, User } from "lucide-react";
import ImageZoomViewer from "@/components/ImageZoomViewer";
import { toast } from "@/components/ui/sonner";
import { motion, AnimatePresence } from "framer-motion";
import BackButton from "@/components/BackButton";
import DotDecal from "@/components/DotDecal";

import InstructionalSlide from "@/components/InstructionalSlide";
import SlideDropdown from "@/components/SlideDropdown";
import type { SlideConfig } from "@/components/InstructionalSlide";

import PhotoGenerationOverlay from "@/components/PhotoGenerationOverlay";
import PaywallOverlay from "@/components/PaywallOverlay";
import PageTitle from "@/components/PageTitle";

import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { useAppData } from "@/contexts/AppDataContext";
import { useOnboarded } from "@/hooks/useOnboarded";
import { supabase } from "@/integrations/supabase/client";

const SET3_KEY = "facefox_set3_seen";

const SET3_SLIDES: SlideConfig[] = [
  {
    emoji: "🔥",
    title: "want to generate her whole social media?",
    pills: [{ text: "make any picture you want 📸", side: "left" }],
  },
  {
    emoji: "🦊",
    title: "facefox is the #1 tool to",
    pills: [
      { text: "generate ai characters 🧑", side: "left" },
      { text: "create any content you want 🧠", side: "right", highlight: true },
      { text: "build out a whole social media fast 🚀", side: "left" },
    ],
  },
  {
    emoji: "💎",
    title: "let's get you some gems",
    pills: [
      { text: "10 gems = 1 photo 💰", side: "left" },
      { text: "we'll give you 5 for free! 🎁", side: "right", highlight: true },
    ],
  },
];

const RATIO_OPTIONS = [
  { value: "3:4", label: "3:4" },
  { value: "9:16", label: "9:16" },
] as const;

const RatioDropdown = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <SlideDropdown label="ratio" value={value} options={RATIO_OPTIONS} onChange={onChange} />
);


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
    <div className="flex items-stretch rounded-[10px] border-2 border-[hsl(var(--border-mid))] overflow-hidden" style={{ backgroundColor: "hsl(var(--card))" }}>
      {options.map((opt, i) => {
        const isSelected = value === opt;
        const isFirst = i === 0;
        const isLast = i === options.length - 1;
        return (
          <Fragment key={opt}>
            {i > 0 && (
              <div aria-hidden className="w-px shrink-0 self-stretch" style={{ backgroundColor: "hsl(var(--border-mid))" }} />
            )}
            <button
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(opt)}
              className="flex-1 flex items-center justify-center px-0 py-[12px] md:py-[14px] text-[16px] md:text-[17px] font-[900] lowercase transition-all"
              style={{
                backgroundColor: isSelected ? "#ffe603" : "transparent",
                color: isSelected ? "#000000" : "#ffffff",
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
  const [focused, setFocused] = useState(false);

  return (
    <div className="relative overflow-hidden rounded-[10px] border-2 border-[hsl(var(--border-mid))] bg-card">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        spellCheck={false}
        autoCorrect="off"
        className="relative z-[1] w-full min-h-[176px] md:min-h-[200px] resize-none bg-transparent px-4 py-3 text-2xl font-[900] lowercase whitespace-pre-wrap break-words text-white focus:outline-none"
        style={{ caretColor: "hsl(var(--foreground))", fontStyle: "normal", fontWeight: 900, textDecoration: "none" }}
      />
      {!value && !focused && <div data-placeholder>{placeholder}</div>}
    </div>
  );
};

/* ── Photo type dropdown ── */
const PHOTO_TYPE_OPTIONS = [
  { value: "selfie", label: "selfie" },
  { value: "photo", label: "photo" },
  { value: "mirror_selfie", label: "mirror selfie" },
] as const;

const PhotoTypeDropdown = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <SlideDropdown label="type" value={value} options={PHOTO_TYPE_OPTIONS} onChange={onChange} />
);

/* ── Expression options ── */
const EXPRESSION_OPTIONS = [
  { value: "casual smile", label: "casual smile 😊" },
  { value: "straight face", label: "straight face 😐" },
  { value: "big smile", label: "big smile 😁" },
  { value: "pout", label: "pout 😘" },
] as const;

/* ── Expression dropdown ── */
const ExpressionDropdown = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => (
  <SlideDropdown label="expression" value={value} options={EXPRESSION_OPTIONS} onChange={onChange} />
);

/* ── Create button ── */
const CreateButton = ({ onClick, disabled, isGenerating, onboardingComplete }: {
  onClick: () => void; disabled: boolean; isGenerating: boolean; onboardingComplete: boolean;
}) => (
  <button
    className="w-full h-14 md:h-16 text-xl md:text-2xl font-[900] lowercase transition-all flex items-center justify-center gap-2 disabled:opacity-50"
    style={{ backgroundColor: "#050a10", color: "#ffffff", border: "2px solid #00e0ff", borderRadius: 10 }}
    onClick={onClick}
    disabled={disabled}
  >
    {isGenerating ? (
      <><Loader2 className="animate-spin" size={18} />creating...</>
    ) : onboardingComplete ? (
      <>create photo <span style={{ color: "#00e0ff" }}>·</span> 10 <Gem size={14} strokeWidth={2.5} style={{ color: "#00e0ff" }} /></>
    ) : "create 🖌️"}
  </button>
);

const Index = () => {
  const { user, loading: authLoading } = useAuth();
  const { credits, refetch: refetchCredits } = useCredits();
  const { characters: cachedCharacters, charactersReady: cachedCharsLoaded, refetch: refetchAppData } = useAppData();
  const navigate = useTransitionNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth?redirect=/create", { replace: true });
    }
  }, [authLoading, user, navigate]);
  const [searchParams] = useSearchParams();
  const { onboardingComplete } = useOnboarded();
  // Set 3 onboarding slides state
  const [showSet3, setShowSet3] = useState(false);
  const [set3Step, setSet3Step] = useState(0);
  const [set3SeenSteps, setSet3SeenSteps] = useState<Set<number>>(new Set());
  const hasSeenSet3 = () => {
    try { return localStorage.getItem(SET3_KEY) === "1"; } catch { return false; }
  };

  const preselectedCharacterId = (location.state as any)?.preselectedCharacterId;
  const persistedCharacterId = typeof window !== "undefined" ? sessionStorage.getItem("facefox_last_selected_character_id") ?? "" : "";
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(() => preselectedCharacterId ? null : (sessionStorage.getItem("facefox_photo_result") || null));
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [error, setError] = useState("");
  const [characters, setCharacters] = useState<Character[]>([]);
  const [charactersLoaded, setCharactersLoaded] = useState(false);
  const [selectedCharId, setSelectedCharId] = useState(preselectedCharacterId || persistedCharacterId || "");
  const cachedOverlay = preselectedCharacterId ? null : sessionStorage.getItem("facefox_photo_overlay");
  const [photoOverlayPhase, setPhotoOverlayPhase] = useState<"hidden" | "loading" | "success">(cachedOverlay === "success" ? "success" : "hidden");
  const [photoOverlayResult, setPhotoOverlayResult] = useState<string | null>(() => cachedOverlay === "success" ? sessionStorage.getItem("facefox_photo_result") : null);
  

  const [photoType, setPhotoType] = useState(() => sessionStorage.getItem("facefox_photo_type") || "selfie");
  const [photoRatio, setPhotoRatio] = useState(() => sessionStorage.getItem("facefox_photo_ratio") || "3:4");
  const [expression, setExpression] = useState(() => sessionStorage.getItem("facefox_photo_expression") || "casual smile");

  const [charDropdownOpen, setCharDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownRef2 = useRef<HTMLDivElement>(null);
  const charToggleRef = useRef<HTMLButtonElement>(null);
  const charToggleRef2 = useRef<HTMLButtonElement>(null);
  const [charHighlight, setCharHighlight] = useState<number | null>(null);
  const charWasOpenRef = useRef(false);
  const [charDropdownPos, setCharDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null);

  const selectedChar = useMemo(() => characters.find((c) => c.id === selectedCharId), [characters, selectedCharId]);
  const placeholderText = useStaticPlaceholder(selectedChar?.name || "luna");

  // Always start with empty prompt — clear any stale cached value
  useEffect(() => {
    try { sessionStorage.removeItem("facefox_photo_prompt"); } catch {}
  }, []);

  const updateCharDropdownPos = useCallback(() => {
    const ref = charToggleRef.current || charToggleRef2.current;
    const rect = ref?.getBoundingClientRect();
    if (!rect) return;
    setCharDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    if (!charDropdownOpen) return;
    updateCharDropdownPos();
    window.addEventListener("resize", updateCharDropdownPos);
    window.addEventListener("scroll", updateCharDropdownPos, true);
    return () => {
      window.removeEventListener("resize", updateCharDropdownPos);
      window.removeEventListener("scroll", updateCharDropdownPos, true);
    };
  }, [charDropdownOpen, updateCharDropdownPos]);

  useEffect(() => {
    if (!charDropdownOpen) return;
    const handler = (e: PointerEvent) => {
      const target = e.target as Node;
      if (charToggleRef.current?.contains(target)) return;
      if (charToggleRef2.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      if (dropdownRef2.current?.contains(target)) return;
      const portal = document.getElementById("char-dropdown-portal");
      if (portal?.contains(target)) return;
      setCharDropdownOpen(false);
      setCharHighlight(null);
    };
    document.addEventListener("pointerdown", handler, true);
    return () => document.removeEventListener("pointerdown", handler, true);
  }, [charDropdownOpen]);

  useEffect(() => {
    const handler = () => {
      setPhotoOverlayPhase("hidden");
      // Clear cached overlay state
      try {
        sessionStorage.removeItem("facefox_photo_overlay");
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
        const copiedPrompt = localStorage.getItem("facefox_copied_prompt");
        const copiedTsRaw = localStorage.getItem("facefox_copied_prompt_ts");
        const appliedTsRaw = sessionStorage.getItem("facefox_applied_copied_prompt_ts");

        if (!copiedPrompt || !copiedTsRaw) return;

        const copiedTs = Number(copiedTsRaw);
        const appliedTs = Number(appliedTsRaw || "0");

        if (!Number.isFinite(copiedTs) || copiedTs <= appliedTs) return;

        setPrompt(copiedPrompt);
        setResultImage(null);
        setPhotoOverlayResult(null);
        try { sessionStorage.removeItem("facefox_photo_result"); sessionStorage.removeItem("facefox_photo_overlay"); } catch {}
        sessionStorage.setItem("facefox_applied_copied_prompt_ts", String(copiedTs));
      } catch {}
    };

    const handler = (e: StorageEvent) => {
      if (e.key === "facefox_copied_prompt" || e.key === "facefox_copied_prompt_ts") {
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

  // Use cached characters instead of fetching
  useEffect(() => {
    if (!user) {
      setCharacters([]);
      setCharactersLoaded(true);
      return;
    }
    if (!cachedCharsLoaded) return;

    const data = cachedCharacters as Character[];
    if (data.length > 0) {
      setCharacters(data);
      const persisted = sessionStorage.getItem("facefox_last_selected_character_id") ?? "";
      const validPersisted = data.some((c) => c.id === persisted);
      const pickId = preselectedCharacterId && data.some((c) => c.id === preselectedCharacterId)
        ? preselectedCharacterId
        : validPersisted
          ? persisted
          : data[0].id;
      setSelectedCharId(pickId);
      sessionStorage.setItem("facefox_last_selected_character_id", pickId);
    } else {
      setCharacters([]);
    }
    setCharactersLoaded(true);
  }, [user, cachedCharacters, cachedCharsLoaded, preselectedCharacterId]);

  if (!user && !authLoading) return <div className="min-h-screen bg-background" />;

  const handleCharacterSelect = (charId: string) => {
    setSelectedCharId(charId);
    sessionStorage.setItem("facefox_last_selected_character_id", charId);
    setPrompt("");
  };

  const previewAspect = photoRatio === "9:16" ? "9/16" : "3/4";

  const handleCreate = async () => {
    if (!user) { navigate(`/auth?redirect=${encodeURIComponent("/create")}`); return; }
    if (!selectedCharId || !prompt.trim()) { toast.error("fill all info"); return; }
    if (!onboardingComplete) {
      setShowSet3(true);
      setSet3Step(0);
      setSet3SeenSteps(new Set());
      return;
    }
    if (credits <= 0) { navigate("/top-ups"); return; }

    setIsGenerating(true);
    setError("");
    setResultImage(null);
    setPhotoOverlayPhase("loading");
    setPhotoOverlayResult(null);
    try { sessionStorage.removeItem("facefox_photo_result"); sessionStorage.removeItem("facefox_photo_overlay"); } catch {}

    toast("10 gems used");
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
        console.error("[gen-debug] supabase.functions.invoke fnError:", {
          fnError,
          message: fnError?.message,
          name: fnError?.name,
          status: (fnError as any)?.status,
          context: (fnError as any)?.context,
          stringified: (() => { try { return JSON.stringify(fnError); } catch { return "<unstringifiable>"; } })(),
        });
        const msg = typeof fnError === "object" && fnError.message ? fnError.message : String(fnError);
        throw new Error(msg);
      }
      if (data?.error) {
        console.error("[gen-debug] edge function returned data.error:", { error: data.error, code: data?.code, fullData: data });
        if (data?.code === "CONTENT_POLICY") {
          toast("not allowed");
          setPhotoOverlayPhase("hidden");
          await refetchCredits();
          return;
        }
        if (data?.code === "NO_GEMS") {
          setPhotoOverlayPhase("hidden");
          navigate("/top-ups");
          return;
        }
        if (data?.code === "RATE_LIMITED") {
          toast.error("too fast");
          setPhotoOverlayPhase("hidden");
          return;
        }
        throw new Error(data.error);
      }

      const rawUrl = (data.images || [])[0] || null;
      if (!rawUrl) {
        throw new Error("no image returned — the AI may have rejected this prompt");
      }
      // Append cache-buster to prevent browser from showing a stale cached image
      const generatedUrl = rawUrl + (rawUrl.includes("?") ? "&" : "?") + "t=" + Date.now();

      setPhotoOverlayResult(generatedUrl);
      setPhotoOverlayPhase("success");
      setResultImage(generatedUrl);
      // Cache for refresh persistence
      try {
        sessionStorage.setItem("facefox_photo_result", generatedUrl);
        sessionStorage.setItem("facefox_photo_overlay", "success");
      } catch {}

      await refetchCredits();
      void refetchAppData();
    } catch (e: any) {
      console.error("[gen-debug] photo generation catch:", {
        error: e,
        message: e?.message,
        name: e?.name,
        stack: e?.stack,
        timestamp: new Date().toISOString(),
        prompt: userPrompt,
        characterId: selectedCharId,
        photoType,
        aspectRatio: photoRatio,
        expression,
        onboardingComplete,
        credits,
      });
      setPhotoOverlayPhase("hidden");

      const msg = e?.message || String(e);
      if (msg.includes("No gems") || msg.includes("402")) {
        navigate("/top-ups");
      } else if (msg.includes("abort") || msg.includes("AbortError")) {
        toast.error("gen error");
      } else if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("network")) {
        toast.error("gen error");
      } else if (msg.includes("content policy") || msg.includes("safety") || msg.includes("blocked")) {
        toast.error("not allowed");
      } else {
        toast.error("gen error");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const createDisabled = isGenerating;

  // Render Set 3 if active
  if (showSet3) {
    const slide = SET3_SLIDES[set3Step];
    return (
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={set3Step}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
        >
          <InstructionalSlide
            slide={slide}
            alreadySeen={set3SeenSteps.has(set3Step)}
            dashTotal={3}
            dashActive={set3Step}
            showBack={true}
            showForward={true}
            showHeader={true}
            onBack={() => { if (set3Step > 0) { setSet3Step(set3Step - 1); } else { setShowSet3(false); } }}
            onForward={() => {
              const nextStep = set3Step + 1;
              if (nextStep >= SET3_SLIDES.length) {
                try { localStorage.setItem(SET3_KEY, "1"); } catch {}
                setShowSet3(false);
                navigate("/top-ups");
                return;
              }
              setSet3SeenSteps((prev) => new Set(prev).add(set3Step));
              setSet3Step(nextStep);
            }}
          />
        </motion.div>
      </AnimatePresence>
    );
  }

  /* ── Character dropdown content (shared between mobile/desktop) ── */
  const handleCharPointerMove = (e: React.PointerEvent) => {
    if (!charDropdownOpen) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const item = el ? (el as Element).closest("[data-char-idx]") as HTMLElement | null : null;
    setCharHighlight(item ? Number(item.getAttribute("data-char-idx")) : null);
  };

  const handleCharPointerEnd = (e: React.PointerEvent) => {
    const btn = e.currentTarget as HTMLElement;
    if ((btn as any).hasPointerCapture?.(e.pointerId)) (btn as any).releasePointerCapture(e.pointerId);
    if (e.type === "pointercancel") { setCharHighlight(null); return; }
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const item = el ? (el as Element).closest("[data-char-idx]") as HTMLElement | null : null;
    if (item) {
      const idx = Number(item.getAttribute("data-char-idx"));
      if (idx === characters.length) {
        setCharDropdownOpen(false);
        setCharHighlight(null);
        sessionStorage.removeItem("facefox_creator_dismissed");
        sessionStorage.removeItem("facefox_guided_flow_state");
        navigate("/", { state: { openCreator: true } });
      } else {
        const c = characters[idx];
        if (c) { handleCharacterSelect(c.id); setCharDropdownOpen(false); setCharHighlight(null); }
      }
      return;
    }
    const onBtn = !!el && btn.contains(el as Node);
    if (onBtn) { if (charWasOpenRef.current) { setCharDropdownOpen(false); setCharHighlight(null); } return; }
    setCharDropdownOpen(false);
    setCharHighlight(null);
  };

  const charDropdownContent = charDropdownPos ? createPortal(
    <AnimatePresence>
      {charDropdownOpen && (
        <motion.div
          id="char-dropdown-portal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="fixed overflow-hidden"
          style={{
            top: charDropdownPos.top,
            left: charDropdownPos.left,
            width: charDropdownPos.width,
            zIndex: 10001,
            borderRadius: 10,
            border: "2px solid hsl(var(--border-mid))",
            backgroundColor: "#000000",
            boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
          }}
        >
          {characters.map((c, idx) => {
            const isSelected = selectedCharId === c.id;
            return (
              <div key={c.id}>
                {idx > 0 && <div style={{ height: 1, backgroundColor: "hsl(var(--border-mid))" }} />}
                <button
                  type="button"
                  data-char-idx={idx}
                  onClick={() => { handleCharacterSelect(c.id); setCharDropdownOpen(false); setCharHighlight(null); }}
                  className="flex w-full items-center gap-3 px-4 py-3"
                  style={{
                    backgroundColor: charHighlight === idx ? "hsl(var(--card))" : isSelected ? "hsl(var(--card))" : "transparent",
                    touchAction: "none",
                  }}
                >
                  {c.face_image_url ? (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full overflow-hidden shrink-0 border border-white/10">
                      <img src={c.face_image_url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: "hsl(var(--card))" }}>
                      <User size={16} strokeWidth={3} style={{ color: "#ffffff" }} />
                    </div>
                  )}
                  <span className="text-lg font-[900] lowercase truncate" style={{ color: isSelected ? "#ffe603" : "#ffffff" }}>
                    {c.name || "unnamed"}
                  </span>
                </button>
              </div>
            );
          })}
          {characters.length === 0 && user && (
            <div>
              <button
                type="button"
                data-char-idx={characters.length}
                onClick={() => {
                  setCharDropdownOpen(false);
                  setCharHighlight(null);
                  sessionStorage.removeItem("facefox_creator_dismissed");
                  sessionStorage.removeItem("facefox_guided_flow_state");
                  navigate("/", { state: { openCreator: true } });
                }}
                className="flex w-full items-center gap-3 px-4 py-3"
                style={{
                  backgroundColor: charHighlight === characters.length ? "hsl(var(--card))" : "transparent",
                  touchAction: "none",
                }}
              >
                <div className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center" style={{ backgroundColor: "rgba(250,204,21,0.1)", border: "2px solid rgba(250,204,21,0.3)" }}>
                  <span className="text-xs">+</span>
                </div>
                <span className="text-lg font-[900] lowercase" style={{ color: "#ffe603" }}>create character</span>
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  ) : null;

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
      <main className="relative z-[1] w-full max-w-lg mx-auto px-[32px] pt-[32px] pb-[110px] md:hidden">
        <div className="flex items-center gap-3 mb-[34px]">
          <BackButton />
          <PageTitle className="mb-0">create photo</PageTitle>
        </div>

        <div className="flex flex-col gap-7">
          <div className="w-[75%] mx-auto flex flex-col gap-5" style={{ overflowAnchor: "none" }}>
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                ref={charToggleRef}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  charWasOpenRef.current = charDropdownOpen;
                  if (!charDropdownOpen) setCharDropdownOpen(true);
                }}
                onPointerMove={handleCharPointerMove}
                onPointerUp={handleCharPointerEnd}
                onPointerCancel={handleCharPointerEnd}
                className="flex w-full items-center gap-3 h-14 px-4 transition-colors active:scale-[0.99]"
                style={{ borderRadius: 10, backgroundColor: "#ffe603", touchAction: "none" }}
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
            </div>

            <div className="relative rounded-[10px] border-2 border-[hsl(var(--border-mid))] bg-card overflow-hidden">
              <div
                className="relative flex w-full items-center justify-center bg-card"
                style={{ aspectRatio: "9/16" }}
              >
                <div className="w-full" style={{ aspectRatio: previewAspect, maxHeight: "100%" }}>
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
                </div>
              </div>
            </div>
          </div>

          <ExpressionDropdown value={expression} onChange={(v) => { setExpression(v); sessionStorage.setItem("facefox_photo_expression", v); }} />

          <div className="flex gap-3">
            <PhotoTypeDropdown value={photoType} onChange={(v) => { setPhotoType(v); sessionStorage.setItem("facefox_photo_type", v); }} />
            <RatioDropdown value={photoRatio} onChange={(v) => { setPhotoRatio(v); sessionStorage.setItem("facefox_photo_ratio", v); }} />
          </div>

          <div className="relative">
            <span className="block text-lg md:text-xl font-[900] lowercase mb-2 text-white">describe your photo</span>
            <HighlightedPromptArea
              value={prompt}
              onChange={(v) => {
                setPrompt(v);
              }}
              charName={selectedChar?.name || ""}
              placeholder={
                <div className="pointer-events-none absolute left-4 top-3 right-4">
                  <span className="text-2xl font-extrabold lowercase" style={{ color: "rgba(255,255,255,0.25)" }}>{placeholderText}</span>
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
      <main className="hidden md:block relative z-[1] w-full max-w-6xl mx-auto px-[56px] pt-[32px] pb-[280px]">
        <div className="flex items-center gap-3 mb-[38px]">
          <BackButton />
          <PageTitle className="mb-0">create photo</PageTitle>
        </div>

        <div className="grid grid-cols-12 gap-8">
          {/* Left: preview + character selector */}
          <div className="col-span-5 flex flex-col gap-5">
            <div className="relative" ref={dropdownRef2}>
              <button
                type="button"
                ref={charToggleRef2}
                onPointerDown={(e) => {
                  if (e.button !== 0) return;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  charWasOpenRef.current = charDropdownOpen;
                  if (!charDropdownOpen) setCharDropdownOpen(true);
                }}
                onPointerMove={handleCharPointerMove}
                onPointerUp={handleCharPointerEnd}
                onPointerCancel={handleCharPointerEnd}
                className="flex w-full items-center gap-3 h-16 px-5 transition-colors active:scale-[0.99] hover-glow"
                style={{ borderRadius: 10, backgroundColor: "#ffe603", touchAction: "none" }}
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
            </div>

            <div className="relative rounded-[10px] border-2 border-[hsl(var(--border-mid))] bg-card overflow-hidden">
              <div
                className="relative flex w-full items-center justify-center bg-card"
                style={{ aspectRatio: "9/16" }}
              >
                <div className="w-full" style={{ aspectRatio: previewAspect, maxHeight: "100%" }}>
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
                </div>
              </div>
            </div>
          </div>

          {/* Right: controls */}
          <div className="col-span-7 flex flex-col gap-6">
            <ExpressionDropdown value={expression} onChange={(v) => { setExpression(v); sessionStorage.setItem("facefox_photo_expression", v); }} />

            <div className="flex gap-4">
              <PhotoTypeDropdown value={photoType} onChange={(v) => { setPhotoType(v); sessionStorage.setItem("facefox_photo_type", v); }} />
              <RatioDropdown value={photoRatio} onChange={(v) => { setPhotoRatio(v); sessionStorage.setItem("facefox_photo_ratio", v); }} />
            </div>

            <div className="relative">
              <span className="block text-lg md:text-xl font-[900] lowercase mb-2 text-white">describe your photo</span>
              <HighlightedPromptArea
                value={prompt}
                onChange={(v) => {
                  setPrompt(v);
                }}
                charName={selectedChar?.name || ""}
                placeholder={
                  <div className="pointer-events-none absolute left-4 top-3 right-4">
                    <span className="text-2xl font-extrabold lowercase" style={{ color: "rgba(255,255,255,0.25)" }}>{placeholderText}</span>
                  </div>
                }
              />
            </div>

            <CreateButton onClick={handleCreate} disabled={createDisabled} isGenerating={isGenerating} onboardingComplete={onboardingComplete} />
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-[10px] border-[2px] border-destructive/30 bg-destructive/5 p-4 text-sm font-extrabold lowercase text-destructive">
            {error}
          </div>
        )}
      </main>

      <ImageZoomViewer url={expandedImage} onClose={() => setExpandedImage(null)} />

      <div className="fixed left-0 right-0 bottom-0 z-10 px-[32px] md:hidden pointer-events-none" style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)", background: "linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.95) 25%, rgba(0,0,0,0.7) 50%, rgba(0,0,0,0.3) 70%, transparent 100%)", paddingTop: 24 }}>
        <div className="mx-auto max-w-lg pointer-events-auto">
          <CreateButton onClick={handleCreate} disabled={createDisabled} isGenerating={isGenerating} onboardingComplete={onboardingComplete} />
        </div>
      </div>
      {charDropdownContent}
    </div>
  );
};

export default Index;
