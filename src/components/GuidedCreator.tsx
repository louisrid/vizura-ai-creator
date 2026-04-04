import { useState, useCallback, useEffect, useRef, forwardRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, RefreshCw, Upload, Gem, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProgressBarLoader from "@/components/loading/ProgressBarLoader";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/components/ui/sonner";

/* ── Constants ── */
const Y = "#facc15";
const FLOW_STATE_KEY = "vizura_guided_flow_state";
const SLIDE_FADE_DURATION = 0.2;
const OVERLAY_FADE_DURATION = 0.75;

/* ── Name toast ── */
const getRandomNameToast = () => "great choice!";

/*
 * SCREEN ORDER (13 screens, internalStep 0-12):
 *  0: Hero (new first screen with rings)
 *  1: Intro
 *  2: Name input
 *  3-9: Traits
 * 10: Description
 * 11: Reference
 * 12: Create
 */

const TRAITS = [
  { key: "skin", label: "choose skin tone", emoji: "🎨", options: ["asian", "black", "tan", "white"] },
  { key: "bodyType", label: "choose body shape", emoji: "👙", options: ["slim", "average", "curvy"], defaultOption: "average" },
  { key: "age", label: "choose her age", emoji: "🎂", options: ["18-23", "24-28", "29+"] },
  { key: "hairStyle", label: "choose hairstyle", emoji: "✂️", options: ["curly", "straight", "bangs"] },
  { key: "hairColour", label: "choose hair colour", emoji: "🖌️", options: ["pink", "black", "brunette", "blonde"] },
  { key: "eye", label: "choose eye colour", emoji: "👁️", options: ["brown", "blue", "green"] },
  { key: "makeup", label: "choose her makeup", emoji: "💄", options: ["natural", "classic"], defaultOption: "classic" },
] as const;

type TraitKey = (typeof TRAITS)[number]["key"];

/* ── Shared styles ── */
const SLIDE_TITLE_CLASS = "text-center text-[32px] font-[900] lowercase leading-[1.05] tracking-tight text-white";
const HELPER_CLASS = "text-[12px] font-[800] lowercase text-white/70";

/* ── Top yellow line (used on hero only) ── */
const TopLine = () => (
  <div
    className="pointer-events-none absolute top-0 left-0 right-0"
    style={{
      height: 5,
      zIndex: 2,
      background: `linear-gradient(90deg, ${Y} 0%, ${Y} 20%, rgba(250,204,21,0.3) 50%, transparent 80%)`,
    }}
  />
);

/* ── Animated rings (hero only) ── */
const AnimatedRings = ({ t }: { t: number }) => (
  <div className="relative flex items-center justify-center" style={{ width: 280, height: 280, marginBottom: 18 }}>
    {/* Inner ring */}
    <div className="absolute" style={{
      width: 150, height: 150, borderRadius: "50%",
      border: `2px solid ${Y}`, borderLeftColor: "transparent",
      transform: `rotate(${t * 1.2}deg)`,
      top: "50%", left: "50%", marginTop: -75, marginLeft: -75,
    }} />
    {/* Mid ring */}
    <div className="absolute" style={{
      width: 200, height: 200, borderRadius: "50%",
      border: `8px solid ${Y}`, borderTopColor: "transparent", borderRightColor: "transparent",
      transform: `rotate(${t * -0.8}deg)`,
      top: "50%", left: "50%", marginTop: -100, marginLeft: -100,
    }} />
    {/* Outer ring */}
    <div className="absolute" style={{
      width: 245, height: 245, borderRadius: "50%",
      border: `3px solid ${Y}`, borderBottomColor: "transparent", borderLeftColor: "transparent",
      transform: `rotate(${t * 0.6}deg)`,
      top: "50%", left: "50%", marginTop: -122.5, marginLeft: -122.5,
    }} />
    {/* Dashed ring */}
    <div className="absolute" style={{
      width: 278, height: 278, borderRadius: "50%",
      border: `2px dashed ${Y}`,
      transform: `rotate(${t * -0.4}deg)`,
      top: "50%", left: "50%", marginTop: -139, marginLeft: -139,
    }} />
    <span style={{ fontSize: 82, position: "relative", zIndex: 1 }}>👩‍🎤</span>
  </div>
);

/* ── Nav arrow (cyan/blue style) ── */
const CYAN = "#00e0ff";
const NavArrow = forwardRef<HTMLButtonElement, { direction: "left" | "right"; onClick: () => void; disabled?: boolean }>(
  ({ direction, onClick, disabled }, ref) => {
    const isForward = direction === "right";
    return (
      <button
        ref={ref}
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
        disabled={disabled}
        className="flex items-center justify-center active:opacity-70 transition-opacity duration-150"
        style={{
          width: 62, height: 62, borderRadius: 16,
          backgroundColor: isForward ? CYAN : "rgba(0,224,255,0.08)",
          border: isForward ? "none" : `2.5px solid rgba(0,224,255,0.3)`,
          outline: "none", padding: 0, cursor: "pointer",
          color: isForward ? "#000" : CYAN,
        }}
      >
        {direction === "left" ? (
          <svg width="22" height="18" viewBox="0 0 20 16" fill="none">
            <path d="M8 1L1.5 8L8 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="2" y1="8" x2="18.5" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="22" height="18" viewBox="0 0 20 16" fill="none">
            <path d="M12 1L18.5 8L12 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="1.5" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        )}
      </button>
    );
  }
);
NavArrow.displayName = "NavArrow";

/* ── Interactive pill ── */
const InteractivePill = ({ label, selected, shaking, onClick }: {
  label: string; selected: boolean; shaking: boolean; onClick: () => void;
}) => (
  <motion.button
    type="button"
    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
    animate={
      selected
        ? { scale: [1, 1.08, 1], transition: { duration: 0.15 } }
        : shaking
          ? { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.25 } }
          : {}
    }
    className="flex w-full items-center justify-center"
    style={{
      height: 56,
      borderRadius: 14,
      padding: "10px 16px",
      fontSize: 17,
      fontWeight: 900,
      textTransform: "lowercase",
      letterSpacing: "-0.01em",
      transition: "background-color 0.15s ease-out, color 0.15s ease-out, border-color 0.15s ease-out",
      ...(selected
        ? { backgroundColor: Y, color: "#000", border: `2px solid ${Y}` }
        : { backgroundColor: "#111", color: "#fff", border: "2px solid #222" }
      ),
    }}
  >
    <span className="block leading-none text-center whitespace-nowrap">{label}</span>
  </motion.button>
);

/* ── Loading phrases ── */
const COOKING_PHRASES = ["mapping your features…", "building your look…", "training the AI…", "final touches…"];
const COOKING_SUCCESS_HOLD = 4000;
const COOKING_EXIT_DURATION = 750;

/* ── Types ── */
export interface GuidedSelections {
  skin: string; bodyType: string; hairStyle: string;
  hairColour: string; eye: string; makeup: string;
  characterName: string; age: string;
  description: string;
  referenceImage: string | null;
  referenceStrength: number;
}

const emptySelections: GuidedSelections = {
  skin: "", bodyType: "", hairStyle: "", hairColour: "", eye: "", makeup: "",
  characterName: "", age: "", description: "",
  referenceImage: null, referenceStrength: 50,
};

interface GuidedCreatorProps {
  open: boolean;
  onComplete: (selections: GuidedSelections) => void;
  onExit: (partialSelections: Partial<GuidedSelections>) => void;
  skipWelcome?: boolean;
}

const TOTAL_FULL = 13;
const TOTAL_SKIP = 11;

const ageRangeToNumber = (range: string): string => {
  switch (range) {
    case "18-23": return "20";
    case "24-28": return "26";
    case "29+": return "32";
    default: return "25";
  }
};

const RANDOM_NAMES = ["luna","ivy","mia","zara","nova","aria","lily","jade","ruby","ella","cleo","skye","maya","lola","nina","sara","rose","nora","kira","dana","lexi","tara","zoey","emma","anna","eva","gia","mila","vera","ayla"];

const normaliseLegacySelections = (partial: Partial<GuidedSelections>): Partial<GuidedSelections> => ({
  ...partial,
  skin: partial.skin === "pale" ? "white" : partial.skin === "dark" ? "black" : partial.skin,
  makeup: partial.makeup === "glam" || partial.makeup === "model" ? "classic" : partial.makeup,
});

/* ══════════════════════════════════════════
   MAIN COMPONENT
   ══════════════════════════════════════════ */
const GuidedCreator = ({ open, onComplete, onExit, skipWelcome = false }: GuidedCreatorProps) => {
  const { user } = useAuth();
  const navigateTo = useNavigate();
  const isLoggedIn = !!user;

  const TOTAL = skipWelcome ? TOTAL_SKIP : TOTAL_FULL;
  const offset = skipWelcome ? 2 : 0;

  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<GuidedSelections>({ ...emptySelections });
  const [shaking, setShaking] = useState(false);
  const mounted = typeof document !== "undefined";
  const [visible, setVisible] = useState(false);
  const [initialFadeIn, setInitialFadeIn] = useState(true);
  const [backArrowShaking, setBackArrowShaking] = useState(false);
  const [nameToastShown, setNameToastShown] = useState(false);
  const animating = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const [ringT, setRingT] = useState(0);

  const [cookingPhase, setCookingPhase] = useState<"none" | "loading" | "success" | "exiting">("none");
  const hasCompletedCookingRef = useRef(false);
  const [exitFade, setExitFade] = useState(false);

  /* Ring animation timer — uses rAF for smooth 60fps */
  useEffect(() => {
    let raf: number;
    const tick = () => { setRingT((v) => v + 1); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const restoreSavedFlow = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(FLOW_STATE_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (!!saved?.skipWelcome !== skipWelcome) {
        sessionStorage.removeItem(FLOW_STATE_KEY);
        return false;
      }
      setStep(Math.min(Math.max(saved?.step ?? 0, 0), TOTAL - 1));
      setSelections({ ...emptySelections, ...normaliseLegacySelections(saved?.selections ?? {}) });
      return true;
    } catch {
      sessionStorage.removeItem(FLOW_STATE_KEY);
      return false;
    }
  }, [TOTAL, skipWelcome]);

  const selectionsRef = useRef(selections);
  const stepRef = useRef(step);
  selectionsRef.current = selections;
  stepRef.current = step;

  const persistFlow = useCallback(() => {
    if (!visible || cookingPhase !== "none") return;
    sessionStorage.setItem(FLOW_STATE_KEY, JSON.stringify({ step: stepRef.current, selections: selectionsRef.current, skipWelcome }));
  }, [visible, cookingPhase, skipWelcome]);

  useEffect(() => {
    if (open) {
      const restored = restoreSavedFlow();
      if (!restored) {
        setStep(0);
        setSelections({ ...emptySelections });
      }
      setShaking(false);
      setInitialFadeIn(!restored);
      setVisible(true);
      setCookingPhase("none");
      hasCompletedCookingRef.current = false;
      animating.current = false;
      setNameToastShown(false);
      setExitFade(false);
      setSlideDirection(1);
      setBackArrowShaking(false);
      requestAnimationFrame(() => document.getElementById("splash-screen")?.remove());
    }
  }, [open, restoreSavedFlow]);

  useEffect(() => { persistFlow(); }, [persistFlow, step, selections]);

  useEffect(() => {
    if (!visible || !initialFadeIn) return;
    const t = setTimeout(() => setInitialFadeIn(false), 600);
    return () => clearTimeout(t);
  }, [visible, initialFadeIn]);

  useEffect(() => {
    if (!visible) return;
    const root = document.getElementById("root");
    const prev = { body: document.body.style.overflow, html: document.documentElement.style.overflow, root: root?.style.overflow ?? "" };
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (root) root.style.overflow = "hidden";
    const handlePageHide = () => persistFlow();
    window.addEventListener("pagehide", handlePageHide);
    return () => {
      document.body.style.overflow = prev.body;
      document.documentElement.style.overflow = prev.html;
      if (root) root.style.overflow = prev.root;
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [visible, persistFlow]);

  const completeCookingFlow = useCallback(() => {
    if (hasCompletedCookingRef.current) return;
    hasCompletedCookingRef.current = true;
    sessionStorage.removeItem(FLOW_STATE_KEY);
    const final = { ...selectionsRef.current };
    final.age = ageRangeToNumber(final.age);
    onComplete(final);
  }, [onComplete]);

  useEffect(() => {
    if (cookingPhase !== "success") return;
    const t = window.setTimeout(() => setCookingPhase("exiting"), COOKING_SUCCESS_HOLD);
    return () => window.clearTimeout(t);
  }, [cookingPhase]);

  useEffect(() => {
    if (cookingPhase !== "exiting") return;
    const t = window.setTimeout(() => completeCookingFlow(), COOKING_EXIT_DURATION);
    return () => window.clearTimeout(t);
  }, [cookingPhase, completeCookingFlow]);

  const internalStep = step + offset;
  const isHeroSlide = internalStep === 0 && !skipWelcome;
  const isIntroSlide = internalStep === 1 && !skipWelcome;
  const isNameSlide = internalStep === 2;
  const isDescriptionSlide = internalStep === 10;
  const isReferenceSlide = internalStep === 11;
  const isCreateSlide = internalStep === 12;

  const currentTraitIndex = internalStep >= 3 && internalStep <= 9 ? internalStep - 3 : -1;

  const getCurrentTraitKey = (): TraitKey | null => {
    if (currentTraitIndex < 0 || currentTraitIndex >= TRAITS.length) return null;
    return TRAITS[currentTraitIndex].key;
  };

  const isCurrentTraitSelected = () => {
    const key = getCurrentTraitKey();
    if (!key) return true;
    return !!selections[key as keyof GuidedSelections];
  };

  const setTrait = (key: string, value: string) => setSelections((prev) => ({ ...prev, [key]: value }));
  const triggerShake = () => { setShaking(true); setTimeout(() => setShaking(false), 500); };

  const maybeShowNameToast = useCallback((nextName: string) => {
    if (!visible || !isNameSlide || nameToastShown || !nextName.trim()) return;
    setNameToastShown(true);
    toast.success(getRandomNameToast());
  }, [visible, isNameSlide, nameToastShown]);

  const updateCharacterName = useCallback((nextName: string) => {
    setSelections((p) => ({ ...p, characterName: nextName }));
    maybeShowNameToast(nextName);
  }, [maybeShowNameToast]);

  const randomiseName = useCallback(() => {
    updateCharacterName(RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)]);
  }, [updateCharacterName]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelections((p) => ({ ...p, referenceImage: URL.createObjectURL(file) }));
  };

  const advance = useCallback(() => {
    if (animating.current || cookingPhase !== "none") return;
    if (isNameSlide && !selectionsRef.current.characterName.trim()) { triggerShake(); return; }
    if (currentTraitIndex >= 0 && currentTraitIndex < TRAITS.length) {
      const key = TRAITS[currentTraitIndex].key;
      if (!selectionsRef.current[key as keyof GuidedSelections]) { triggerShake(); return; }
    }
    if (isCreateSlide) {
      window.dispatchEvent(new CustomEvent("vizura:blackout:start"));
      setExitFade(true);
      window.setTimeout(() => {
        setExitFade(false);
        setCookingPhase("loading");
      }, 900);
      return;
    }
    animating.current = true;
    setSlideDirection(1);
    const nextStep = step + 1;
    if (nextStep >= TOTAL) return;
    setStep(nextStep);
    setTimeout(() => { animating.current = false; }, 200);
  }, [step, isNameSlide, isCreateSlide, cookingPhase, currentTraitIndex, TOTAL, completeCookingFlow]);

  const goBack = useCallback(() => {
    if (animating.current || cookingPhase !== "none") return;
    if (step <= 0) { setBackArrowShaking(true); setTimeout(() => setBackArrowShaking(false), 500); return; }
    animating.current = true;
    setSlideDirection(-1);
    setStep((s) => s - 1);
    setTimeout(() => { animating.current = false; }, 200);
  }, [step, cookingPhase]);

  const handleClose = () => {
    persistFlow();
    setVisible(false);
    onExit(selectionsRef.current);
  };

  const canAdvance = isHeroSlide || isIntroSlide || isNameSlide || isDescriptionSlide || isReferenceSlide || isCreateSlide || (currentTraitIndex >= 0 && isCurrentTraitSelected());

  if (!mounted || !visible) return null;

  const slideVariants = {
    enter: (dir: number) => ({ opacity: 0, x: dir > 0 ? 30 : -30 }),
    center: { opacity: 1, x: 0 },
    exit: (dir: number) => ({ opacity: 0, x: dir > 0 ? -30 : 30 }),
  };

  /* ── HERO SLIDE (new first screen) ── */
  const renderHero = () => (
    <div className="flex w-full flex-col items-center" style={{ marginTop: 60 }}>
      <AnimatedRings t={ringT} />
      <div style={{ fontSize: 60, fontWeight: 900, color: "#fff", textTransform: "lowercase" as const, letterSpacing: "-0.03em", lineHeight: 1 }}>vizura</div>
      <div style={{ width: 40, height: 4, background: Y, marginTop: 8, marginBottom: 0, borderRadius: 3 }} />
      <div className="flex flex-col items-center" style={{ marginTop: 20, gap: 8 }}>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); advance(); }}
          style={{
            width: 168, padding: "10px", background: Y, border: "none", borderRadius: 12,
            fontSize: 18, fontWeight: 900, color: "#000", textTransform: "lowercase" as const,
            cursor: "pointer",
          }}
        >
          start now
        </button>
        {!isLoggedIn && (
          <button
            type="button"
            onClick={() => navigateTo(`/auth${window.location.search}`)}
            style={{
              width: 168, padding: "8px", background: "#111", border: "2px solid #222",
              borderRadius: 12, fontSize: 18, fontWeight: 900, color: "#fff",
              textTransform: "lowercase" as const, cursor: "pointer",
            }}
          >
            login
          </button>
        )}
      </div>
    </div>
  );

  /* ── Slide renderer ── */
  const renderSlide = () => {
    if (isHeroSlide) return renderHero();

    /* Intro */
    if (isIntroSlide) return (
      <div className="flex w-full flex-col items-center">
        <span className="text-[64px] mb-5">💫</span>
        <h2 className={SLIDE_TITLE_CLASS}>time to create your<br />first character!</h2>
        <p className="mt-5 text-[13px] font-[800] lowercase text-white/70">tap → to continue</p>
      </div>
    );

    /* Name */
    if (isNameSlide) return (
      <div className="flex w-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <span className="text-[64px] mb-5">✨</span>
        <h2 className={SLIDE_TITLE_CLASS}>give her a name</h2>
        <div className="mt-6 flex items-center gap-2.5 w-full max-w-[17rem]">
          <motion.input
            animate={shaking && !selections.characterName.trim() ? { x: [0, -6, 6, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
            value={selections.characterName}
            onChange={(e) => updateCharacterName(e.target.value)}
            placeholder="type a name…"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); advance(); } }}
            className="h-[56px] flex-1 min-w-0 px-4 text-[17px] font-[900] lowercase text-white placeholder:text-white/30 outline-none transition-colors duration-150"
            style={{ borderRadius: 14, border: "2px solid #222", backgroundColor: "#111" }}
          />
          <motion.button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); randomiseName(); }}
            whileTap={{ scale: 0.85, rotate: 180 }}
            className="flex h-[56px] w-[56px] shrink-0 items-center justify-center text-black active:opacity-70 transition-opacity duration-150"
            style={{ borderRadius: 14, backgroundColor: Y }}
          >
            <RefreshCw size={20} strokeWidth={2.5} />
          </motion.button>
        </div>
      </div>
    );

    /* Trait slides */
    if (currentTraitIndex >= 0) {
      const trait = TRAITS[currentTraitIndex];
      const selectedVal = selections[trait.key as keyof GuidedSelections] as string;
      return (
        <div className="flex w-full flex-col items-center">
          <span className="text-[64px] mb-5">{trait.emoji}</span>
          <h2 className={SLIDE_TITLE_CLASS}>{trait.label}</h2>
          <div className={`mt-6 grid w-full gap-3.5 px-2 ${
            trait.options.length === 4 ? "max-w-[21rem] grid-cols-2"
              : trait.options.length === 2 ? "max-w-[17rem] grid-cols-2 mx-auto"
              : "max-w-[23rem] grid-cols-3"
          }`}>
            {trait.options.map((opt) => (
              <div key={opt} className="flex flex-col items-center gap-1">
                <InteractivePill
                  label={opt}
                  selected={selectedVal === opt}
                  shaking={shaking && selectedVal !== opt}
                  onClick={() => setTrait(trait.key, opt)}
                />
                {"defaultOption" in trait && trait.defaultOption === opt && (
                  <span className={`${HELPER_CLASS} mt-0.5`}>(recommended)</span>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    /* Description */
    if (isDescriptionSlide) return (
      <div className="flex w-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <h2 className={SLIDE_TITLE_CLASS}>describe her</h2>
        <p className={`mt-2 ${HELPER_CLASS}`}>(optional)</p>
        <div className="mt-5 w-full max-w-[18rem]">
          <textarea
            value={selections.description}
            onChange={(e) => setSelections((p) => ({ ...p, description: e.target.value }))}
            placeholder="add any details you want…"
            rows={6}
            onClick={(e) => e.stopPropagation()}
            className="min-h-[160px] w-full resize-none px-4 py-3 text-[16px] font-[800] lowercase text-white placeholder:text-white/30 outline-none transition-colors duration-150"
            style={{ borderRadius: 14, border: "2px solid #222", backgroundColor: "#111" }}
          />
          <p className={`mt-3 text-center ${HELPER_CLASS}`}>i.e. chubby cheeks, freckles, thick mascara</p>
        </div>
      </div>
    );

    /* Reference */
    if (isReferenceSlide) return (
      <div className="flex w-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <h2 className={SLIDE_TITLE_CLASS}>add a reference</h2>
        <p className={`mt-2 ${HELPER_CLASS}`}>(optional)</p>
        <div className="mt-5 flex w-full max-w-[11rem] flex-col items-center gap-4">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
          {selections.referenceImage ? (
            <div className="w-full">
              <div className="relative w-full overflow-hidden" style={{ borderRadius: 14, border: "2px solid #222", aspectRatio: "3/4" }}>
                <img src={selections.referenceImage} alt="Reference" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelections((p) => ({ ...p, referenceImage: null })); }}
                  className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white text-xs font-bold"
                >×</button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
              className="flex w-full flex-col items-center justify-center gap-2 transition-colors duration-150"
              style={{ aspectRatio: "3/4", borderRadius: 14, border: "2px dashed #333", backgroundColor: "#111" }}
            >
              <Upload size={16} strokeWidth={2.5} className="text-white/30" />
              <span className="text-[12px] font-extrabold lowercase text-white/30">upload image</span>
            </button>
          )}
          <div className="w-full space-y-2 mb-4">
            <div className="flex items-center justify-between">
              <span className={HELPER_CLASS}>strength</span>
              <span className={HELPER_CLASS}>{selections.referenceStrength}%</span>
            </div>
            <input
              type="range" min={0} max={100}
              value={selections.referenceStrength}
              onChange={(e) => { e.stopPropagation(); setSelections((p) => ({ ...p, referenceStrength: Number(e.target.value) })); }}
              onClick={(e) => e.stopPropagation()}
              className="w-full cursor-pointer appearance-none rounded-full"
              style={{ background: `linear-gradient(to right, ${Y} ${selections.referenceStrength}%, #222 ${selections.referenceStrength}%)` }}
            />
            <p className={HELPER_CLASS}>(recommended: 50%)</p>
          </div>
        </div>
      </div>
    );

    /* Create slide */
    if (isCreateSlide) {
      const isFirstCharacter = !isLoggedIn || !skipWelcome;
      return (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!exitFade) advance(); }}
          className="flex min-h-[14rem] w-full flex-col items-center justify-center bg-transparent px-4 text-center cursor-pointer"
          disabled={exitFade}
        >
          <h2 className="mx-auto text-center text-[3rem] font-[900] lowercase leading-[1.05] tracking-tight">
            <span className="block text-white">your character</span>
            <span className="block"><span className="text-white">is </span><span className="text-gem-green">almost here!</span></span>
          </h2>
          {!isFirstCharacter && (
            <div className="mt-6 flex items-center gap-1.5">
              <Gem size={18} strokeWidth={2.5} className="text-gem-green" />
              <span className="text-[15px] font-[900] lowercase text-white/70">30 gems</span>
            </div>
          )}
          <p className="mt-6 text-[14px] font-[800] lowercase text-white/70">tap to continue</p>
        </button>
      );
    }

    return null;
  };

  /* ── Cooking ── */
  const renderCooking = () => {
    if (cookingPhase === "loading") return (
      <div className="flex flex-col items-center w-full" onClick={() => {}} onClickCapture={() => {}}>
        <ProgressBarLoader
          duration={25000} phrases={COOKING_PHRASES} phraseInterval={5200}
          requireTapToContinue={false}
          onComplete={() => setCookingPhase("success")}
        />
      </div>
    );
    if (cookingPhase === "success" || cookingPhase === "exiting") return (
      <motion.div
        key="cooking-success"
        className="fixed inset-0 z-[10000] flex flex-col items-center justify-center px-6"
        style={{ background: "hsl(140, 100%, 50%)" }}
        initial={{ opacity: 0 }}
        animate={{ opacity: cookingPhase === "exiting" ? 0 : 1 }}
        transition={{ duration: OVERLAY_FADE_DURATION, ease: "easeInOut" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
        >
          <p className="text-center text-[3rem] font-[900] lowercase leading-[1.05] tracking-tight text-black">
            <span className="block">character</span><span className="block">created!</span>
          </p>
        </motion.div>
      </motion.div>
    );
    return null;
  };

  const isCooking = cookingPhase !== "none";
  const showNavigation = !isCooking && !isHeroSlide;
  const canExitFlow = skipWelcome && isLoggedIn && !isCooking;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col overflow-hidden" style={{ background: "#000" }}>
      {isHeroSlide && <TopLine />}
      {/* Exit fade */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-50 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: exitFade ? 1 : 0 }}
        transition={{ duration: 0.9, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: initialFadeIn ? OVERLAY_FADE_DURATION : 0.2 }}
      >
        {/* Close button removed — home icon below arrows is the only exit */}
        {/* Skip button removed */}

        {/* Content area */}
        <div className="absolute inset-0 flex items-center justify-center px-6">
          <div className="w-full max-w-sm mx-auto flex flex-col items-center">
            <AnimatePresence mode="wait" custom={slideDirection}>
              <motion.div
                key={isCooking ? "cooking" : step}
                className="w-full"
                custom={slideDirection}
                variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {isCooking ? renderCooking() : renderSlide()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom nav — only on non-hero slides */}
        {showNavigation && (
          <div className="absolute inset-x-0 flex flex-col items-center px-4" style={{ top: 0, paddingTop: "max(env(safe-area-inset-top), 16px)" }}>
            {/* Progress dots at TOP */}
            <div className="flex items-center justify-center gap-[3px]" style={{ padding: "0 50px", width: "100%", marginBottom: 0 }}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="transition-all duration-300" style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: i <= Math.round(((step) / TOTAL) * 11) ? Y : "rgba(250,204,21,0.1)",
                }} />
              ))}
            </div>
          </div>
        )}

        {/* Arrow buttons + home icon — positioned below content */}
        {showNavigation && (
          <div className="absolute inset-x-0 flex flex-col items-center" style={{ bottom: "6%" }}>
            <div className="flex items-center justify-center gap-4">
              <motion.div animate={backArrowShaking ? { x: [0, -6, 6, -4, 4, 0] } : {}} transition={{ duration: 0.4 }}>
                <NavArrow direction="left" onClick={goBack} />
              </motion.div>
              <NavArrow direction="right" onClick={advance} disabled={!canAdvance && currentTraitIndex >= 0} />
            </div>
            {/* Home exit icon — no border, thick white, bigger, lower */}
            <button
              type="button"
              onClick={handleClose}
              className="mt-6 flex items-center justify-center active:opacity-70 transition-opacity duration-150"
              aria-label="go home"
            >
              <Home size={28} strokeWidth={3} style={{ color: "rgba(255,255,255,0.7)" }} />
            </button>
          </div>
        )}
      </motion.div>
    </div>,
    document.body,
  );
};

/* ══════════════════════════════════════════
   SIGN-IN OVERLAY
   ══════════════════════════════════════════ */
export const SignInOverlay = ({ open, onSignedIn }: { open: boolean; onSignedIn: () => void }) => {
  const { user, signIn, signUp } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const [visible, setVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    if (open && !user) setVisible(true);
    if (user && visible) { onSignedIn(); setVisible(false); }
  }, [open, user, visible, onSignedIn]);

  useEffect(() => {
    if (!visible) return;
    const root = document.getElementById("root");
    const prev = { body: document.body.style.overflow, html: document.documentElement.style.overflow, root: root?.style.overflow ?? "" };
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (root) root.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev.body;
      document.documentElement.style.overflow = prev.html;
      if (root) root.style.overflow = prev.root;
    };
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const timer = window.setTimeout(() => { window.dispatchEvent(new CustomEvent("vizura:blackout:end")); }, 320);
    return () => window.clearTimeout(timer);
  }, [visible]);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    sessionStorage.setItem("vizura_post_auth_home", "1");
    sessionStorage.removeItem("vizura_resume_after_auth");
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });
      if (result?.error) {
        sessionStorage.removeItem("vizura_post_auth_home");
        toast.error("google sign in failed");
        setGoogleLoading(false);
        return;
      }
    } catch (err: any) {
      sessionStorage.removeItem("vizura_post_auth_home");
      toast.error(err.message || "sign in failed");
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) { toast.error("enter email and password"); return; }
    setEmailLoading(true);
    try {
      if (isSignUp) {
        try { await signUp(email.trim(), password); toast.success("check your email to confirm"); }
        catch (err: any) {
          if (err.message?.toLowerCase().includes("already registered")) await signIn(email.trim(), password);
          else throw err;
        }
      } else { await signIn(email.trim(), password); }
    } catch (err: any) { toast.error(err.message || "sign in failed"); setEmailLoading(false); }
  };

  if (!visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" style={{ backgroundColor: "#000" }}>
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.15, ease: "easeInOut" }}
      >
        <div className="relative z-10 flex flex-col items-center px-8 w-full max-w-xs">
          <span className="text-[64px] mb-5">🔐</span>
          <h2 className="text-center text-[2.2rem] font-[900] lowercase leading-[1.05] tracking-tight text-white">
            sign in to<br />save her
          </h2>
          <button
            onClick={handleGoogle}
            disabled={googleLoading || emailLoading}
            className="mt-8 w-full h-[56px] flex items-center justify-center gap-2 active:scale-[0.95] disabled:opacity-50 transition-transform duration-150"
            style={{ background: Y, color: "#000", borderRadius: 14, fontSize: 16, fontWeight: 900, textTransform: "lowercase", border: "none" }}
          >
            {googleLoading ? <><Loader2 className="animate-spin" size={18} />connecting...</> : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                sign in with google
              </>
            )}
          </button>
          <div className="mt-4 flex items-center gap-3 w-full">
            <div className="flex-1 h-[2px] bg-white/10" />
            <span className="text-[10px] font-extrabold lowercase text-white/30">or</span>
            <div className="flex-1 h-[2px] bg-white/10" />
          </div>
          <input
            type="email" placeholder="email" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="mt-4 w-full h-[52px] px-4 text-[15px] font-[800] lowercase text-white placeholder:text-white/30 outline-none transition-colors duration-150"
            style={{ borderRadius: 14, border: "2px solid #222", backgroundColor: "#111" }}
            disabled={emailLoading || googleLoading}
          />
          <input
            type="password" placeholder="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Enter") handleEmailAuth(); }}
            className="mt-2.5 w-full h-[52px] px-4 text-[15px] font-[800] lowercase text-white placeholder:text-white/30 outline-none transition-colors duration-150"
            style={{ borderRadius: 14, border: "2px solid #222", backgroundColor: "#111" }}
            disabled={emailLoading || googleLoading}
          />
          <button
            onClick={handleEmailAuth}
            disabled={emailLoading || googleLoading}
            className="mt-3 w-full h-[56px] text-[15px] font-[900] lowercase text-white flex items-center justify-center gap-2 transition-colors duration-150 disabled:opacity-50"
            style={{ borderRadius: 14, border: "2px solid #222", backgroundColor: "#111" }}
          >
            {emailLoading ? <><Loader2 className="animate-spin" size={18} />signing in...</> : <>{isSignUp ? "sign up" : "sign in"}<ArrowRight size={18} strokeWidth={2.5} /></>}
          </button>
          <button
            type="button"
            onClick={() => setIsSignUp((v) => !v)}
            className="mt-2 w-full text-center text-[10px] font-extrabold lowercase text-white/30 hover:text-white/50 transition-colors duration-150"
          >
            {isSignUp ? "have an account? sign in" : "no account? sign up"}
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

export default GuidedCreator;
