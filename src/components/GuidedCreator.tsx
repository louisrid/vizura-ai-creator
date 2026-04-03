import { useState, useCallback, useEffect, useRef, forwardRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, X, Loader2, RefreshCw, Upload, Gem } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ProgressBarLoader from "@/components/loading/ProgressBarLoader";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/components/ui/sonner";

/* ── Constants ── */
const NEON_BLUE = "#00e0ff";
const PURE_WHITE = "#fff";
const AMBER = "#facc15";
const FLOW_STATE_KEY = "vizura_guided_flow_state";
const SLIDE_FADE_DURATION = 0.2;
const OVERLAY_FADE_DURATION = 0.75;

/* ── Name toast variations ── */
const NAME_TOAST_MESSAGES = [
  "great choice!",
  "great choice!",
  "great choice!",
  "great choice!",
  "great choice!",
  "great choice!",
];

const getRandomNameToast = () =>
  NAME_TOAST_MESSAGES[Math.floor(Math.random() * NAME_TOAST_MESSAGES.length)];

/*
 * SCREEN ORDER (13 screens, internalStep 0-12):
 *  0: Welcome
 *  1: Intro
 *  2: Name input
 *  3: Skin        (TRAITS[0])
 *  4: Body        (TRAITS[1])
 *  5: Age pills   (TRAITS[2])
 *  6: Hair        (TRAITS[3])
 *  7: Hair colour (TRAITS[4])
 *  8: Eyes        (TRAITS[5])
 *  9: Makeup      (TRAITS[6])
 * 10: Description (optional)
 * 11: Reference   (optional)
 * 12: Create slide
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

const SLIDE_TITLE_CLASS = "mt-3 text-center text-[34px] font-[900] lowercase leading-[0.94] tracking-tight text-white";
const SUBTEXT_CLASS = "text-sm font-[900] lowercase text-white/40";
const HELPER_CLASS = "text-[11px] font-[800] lowercase text-white/40";

type TraitKey = (typeof TRAITS)[number]["key"];

/* ── Dots ── */
const Dots = forwardRef<HTMLDivElement, { current: number; total: number }>(({ current, total }, ref) => (
  <div ref={ref} className="flex items-center justify-center gap-[3px]" style={{ padding: "0 50px" }}>
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="transition-all duration-300"
        style={{
          flex: 1,
          height: 5,
          borderRadius: 3,
          background: i <= current ? "#00e0ff" : "rgba(0,224,255,0.1)",
        }}
      />
    ))}
  </div>
));
Dots.displayName = "Dots";

/* ── Nav arrow ── */
const NavArrow = forwardRef<HTMLButtonElement, { direction: "left" | "right"; onClick: () => void; disabled?: boolean; className?: string }>(({ direction, onClick, disabled, className }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
    className={`flex items-center justify-center active:opacity-70 transition-opacity duration-150 ${className || ""}`}
    style={{
      width: 48,
      height: 48,
      backgroundColor: direction === "right" ? "rgba(0,224,255,0.1)" : "rgba(0,224,255,0.05)",
      border: direction === "right" ? "2px solid rgba(0,224,255,0.3)" : "2px solid rgba(0,224,255,0.15)",
      borderRadius: 14,
      outline: "none",
      padding: 0,
      cursor: "pointer",
    }}
  >
    {direction === "left" ? (
      <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="rgba(0,224,255,0.45)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="7" x2="2" y2="7" />
        <polyline points="7,2 2,7 7,12" />
      </svg>
    ) : (
      <svg width="18" height="18" viewBox="0 0 14 14" fill="none" stroke="#00e0ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="2" y1="7" x2="12" y2="7" />
        <polyline points="7,2 12,7 7,12" />
      </svg>
    )}
  </button>
));
NavArrow.displayName = "NavArrow";

/* AmbientGlow removed — wizard uses pure #000 */

/* ── Simple emoji with subtle yellow glow ── */
const BigEmoji = ({ emoji }: { emoji: string; index?: number }) => (
  <span className="select-none pointer-events-none text-[56px] inline-block animate-bounce relative" style={{ animationDuration: "2s" }}>
    <span className="absolute inset-0 rounded-full" style={{
      background: "radial-gradient(circle, rgba(250,204,21,0.06) 0%, transparent 70%)",
      transform: "scale(2.5)",
      filter: "blur(8px)",
    }} />
    <span className="relative">{emoji}</span>
  </span>
);

/* ── Interactive pill — bigger for mobile ── */
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
      borderRadius: 11,
      padding: "10px 18px",
      fontSize: 16,
      fontWeight: 800,
      textTransform: "lowercase",
      letterSpacing: "-0.01em",
      transition: "background-color 0.15s ease-out, color 0.15s ease-out, border-color 0.15s ease-out",
      ...(selected
        ? { backgroundColor: "#facc15", color: "#000", border: "2px solid #facc15" }
        : { backgroundColor: "#151515", color: "rgba(255,255,255,0.55)", border: "2px solid #222" }
      ),
    }}
  >
    <span className="block leading-none text-center whitespace-nowrap">{label}</span>
  </motion.button>
);

/* ── Loading phrases for cooking phase ── */
const COOKING_PHRASES = [
  "mapping your features…",
  "building your look…",
  "training the AI…",
  "final touches…",
];
const COOKING_DURATION = 25000;
const COOKING_SUCCESS_HOLD = 4000;
const COOKING_EXIT_DURATION = 750;

/* ── Bouncy word animation for welcome slide ── */
const BouncyWords = ({ text, className, delayStart = 0 }: { text: string; className?: string; delayStart?: number }) => {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.3em]"
          initial={{ opacity: 0, y: 18, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{
            duration: 0.45,
            delay: delayStart + i * 0.12,
            ease: [0.25, 1.1, 0.5, 1],
          }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
};

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
  skin: "", bodyType: "",
  hairStyle: "", hairColour: "", eye: "", makeup: "",
  characterName: "", age: "",
  description: "",
  referenceImage: null,
  referenceStrength: 50,
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
  makeup:
    partial.makeup === "glam" || partial.makeup === "model"
      ? "classic"
      : partial.makeup,
});

const GuidedCreator = ({ open, onComplete, onExit, skipWelcome = false }: GuidedCreatorProps) => {
  const { user } = useAuth();
  const navigateTo = useNavigate();
  const isLoggedIn = !!user;

  const TOTAL = skipWelcome ? TOTAL_SKIP : TOTAL_FULL;
  const offset = skipWelcome ? 2 : 0;

  const [step, setStep] = useState(0);
  const dotTotal = TOTAL;
  const dotCurrent = step;
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

  const [cookingPhase, setCookingPhase] = useState<"none" | "loading" | "success" | "exiting">("none");
  const [cookingPhraseIndex, setCookingPhraseIndex] = useState(0);
  const hasCompletedCookingRef = useRef(false);
  const [exitFade, setExitFade] = useState(false);

  const restoreSavedFlow = useCallback(() => {
    try {
      const raw = sessionStorage.getItem(FLOW_STATE_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw) as {
        step?: number;
        selections?: Partial<GuidedSelections>;
        skipWelcome?: boolean;
      };
      setStep(Math.max(saved?.step ?? 0, 0));
      setSelections({ ...emptySelections, ...normaliseLegacySelections(saved?.selections ?? {}) });
      return true;
    } catch {
      return false;
    }
  }, []);

  const persistFlow = useCallback(() => {
    if (!visible || cookingPhase !== "none") return;
    sessionStorage.setItem(FLOW_STATE_KEY, JSON.stringify({ step: stepRef.current, selections: selectionsRef.current, skipWelcome }));
  }, [visible, cookingPhase, skipWelcome]);

  useEffect(() => {
    if (open) {
      const restored = restoreSavedFlow();
      setShaking(false);
      setInitialFadeIn(!restored);
      setVisible(true);
      setCookingPhase("none");
      setCookingPhraseIndex(0);
      hasCompletedCookingRef.current = false;
      animating.current = false;
      setNameToastShown(false);
      setExitFade(false);
      requestAnimationFrame(() => document.getElementById("splash-screen")?.remove());
    }
  }, [open, restoreSavedFlow]);

  useEffect(() => {
    persistFlow();
  }, [persistFlow, step, selections]);

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
    const t = window.setTimeout(() => {
      setCookingPhase("exiting");
    }, COOKING_SUCCESS_HOLD);
    return () => window.clearTimeout(t);
  }, [cookingPhase]);

  useEffect(() => {
    if (cookingPhase !== "exiting") return;
    const t = window.setTimeout(() => {
      completeCookingFlow();
    }, COOKING_EXIT_DURATION);
    return () => window.clearTimeout(t);
  }, [cookingPhase, completeCookingFlow]);

  const internalStep = step + offset;
  const isWelcomeSlide = internalStep === 0 && !skipWelcome;
  const isIntroSlide = internalStep === 1 && !skipWelcome;
  const isNameSlide = internalStep === 2;
  const isDescriptionSlide = internalStep === 10;
  const isReferenceSlide = internalStep === 11;
  const isCreateSlide = internalStep === 12;

  const currentTraitIndex = internalStep >= 3 && internalStep <= 9 ? internalStep - 3 : -1;
  const isSkinSlide = currentTraitIndex === 0;

  const getCurrentTraitKey = (): TraitKey | null => {
    if (currentTraitIndex < 0 || currentTraitIndex >= TRAITS.length) return null;
    return TRAITS[currentTraitIndex].key;
  };

  const isCurrentTraitSelected = () => {
    const key = getCurrentTraitKey();
    if (!key) return true;
    return !!selections[key as keyof GuidedSelections];
  };

  const setTrait = (key: string, value: string) => {
    setSelections((prev) => ({ ...prev, [key]: value }));
  };

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const selectionsRef = useRef(selections);
  const stepRef = useRef(step);
  selectionsRef.current = selections;
  stepRef.current = step;

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
    const name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    updateCharacterName(name);
  }, [updateCharacterName]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSelections((p) => ({ ...p, referenceImage: url }));
  };

  const advance = useCallback(() => {
    if (animating.current || cookingPhase !== "none") return;

    if (isNameSlide) {
      if (!selectionsRef.current.characterName.trim()) {
        triggerShake();
        return;
      }
      toast.dismiss();
    }

    if (currentTraitIndex >= 0 && currentTraitIndex < TRAITS.length) {
      const key = TRAITS[currentTraitIndex].key;
      if (!selectionsRef.current[key as keyof GuidedSelections]) {
        triggerShake();
        return;
      }
    }

    if (isCreateSlide) {
      window.dispatchEvent(new CustomEvent("vizura:blackout:start"));
      setExitFade(true);
      setTimeout(() => completeCookingFlow(), 1400);
      return;
    }

    animating.current = true;
    setSlideDirection(1);
    const nextStep = step + 1;
    if (nextStep >= TOTAL) return;
    setStep(nextStep);
    setTimeout(() => { animating.current = false; }, 200);
  }, [step, isNameSlide, isCreateSlide, cookingPhase, currentTraitIndex, TOTAL]);

  const goBack = useCallback(() => {
    if (animating.current || cookingPhase !== "none") return;
    if (step <= 0) {
      setBackArrowShaking(true);
      setTimeout(() => setBackArrowShaking(false), 500);
      return;
    }
    animating.current = true;
    setSlideDirection(-1);
    setStep((s) => s - 1);
    setTimeout(() => { animating.current = false; }, 200);
  }, [step, cookingPhase]);

  const handleClose = () => {
    sessionStorage.removeItem(FLOW_STATE_KEY);
    setVisible(false);
    onExit(selectionsRef.current);
  };

  const canAdvance = isWelcomeSlide || isIntroSlide || isNameSlide || isDescriptionSlide || isReferenceSlide || isCreateSlide || (currentTraitIndex >= 0 && isCurrentTraitSelected());

  const preventSubmit = useCallback((e: React.FormEvent) => { e.preventDefault(); }, []);

  if (!mounted || !visible) return null;

  const slideVariants = {
    enter: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? 30 : -30,
    }),
    center: {
      opacity: 1,
      x: 0,
    },
    exit: (dir: number) => ({
      opacity: 0,
      x: dir > 0 ? -30 : 30,
    }),
  };

  const renderSlide = () => {
    /* ── Welcome ── */
    if (isWelcomeSlide) {
      return (
        <div className="flex w-full flex-col items-center">
          <h2 className="mt-1 text-center lowercase leading-[0.95] tracking-tight text-white">
            <BouncyWords text="welcome to" className="block text-[1.5rem] font-[800]" delayStart={0.2} />
            <motion.span
              className="block text-[5.8rem] font-[900] leading-[0.95]"
              initial={{ opacity: 0, scale: 0.6, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease: [0.25, 1.1, 0.5, 1] }}
            >
              <motion.span
                className="inline-block"
                animate={{ scale: [1, 1.02, 1], y: [0, -2, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                vizura!
              </motion.span>
            </motion.span>
          </h2>
          <motion.p
            className="mt-2 text-sm font-extrabold lowercase text-white/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.4 }}
          >
            tap to continue
          </motion.p>
        </div>
      );
    }

    /* ── Intro ── */
    if (isIntroSlide) {
      return (
        <div className="flex w-full flex-col items-center">
          <div className="flex h-14 items-end justify-center">
            <BigEmoji emoji="💫" index={0} />
          </div>
          <h2 className={SLIDE_TITLE_CLASS}>
            time to create your<br />first character!
          </h2>
          <p className="mt-3 text-sm font-extrabold lowercase text-white/40">tap to continue</p>
        </div>
      );
    }

    /* ── Name input slide ── */
    if (isNameSlide) {
      return (
        <div className="flex w-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
          <div className="flex h-14 items-end justify-center">
            <BigEmoji emoji="✨" />
          </div>
          <h2 className={SLIDE_TITLE_CLASS}>
            give her a name
          </h2>
          <div className="mt-5 flex items-center gap-2 w-full max-w-[16rem]">
            <motion.input
              animate={shaking && !selections.characterName.trim() ? { x: [0, -6, 6, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
              value={selections.characterName}
              onChange={(e) => updateCharacterName(e.target.value)}
              placeholder="type a name…"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); advance(); } }}
              className="h-14 flex-1 min-w-0 rounded-2xl border-[5px] border-white/15 bg-white/5 px-4 text-base font-[900] lowercase text-white placeholder:text-white/30 outline-none focus:border-neon-yellow transition-colors duration-150"
            />
            <motion.button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); randomiseName(); }}
              whileTap={{ scale: 0.85, rotate: 180 }}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-[3px] border-white/20 bg-white text-black active:bg-white/70 transition-colors duration-150"
            >
              <RefreshCw size={18} strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      );
    }

    /* ── Trait slides ── */
    if (currentTraitIndex >= 0) {
      const trait = TRAITS[currentTraitIndex];
      const selectedVal = selections[trait.key as keyof GuidedSelections] as string;
      return (
        <div className="flex w-full flex-col items-center">
          <div className="flex h-14 items-end justify-center">
            <BigEmoji emoji={trait.emoji} index={currentTraitIndex + 1} />
          </div>
          <h2 className={SLIDE_TITLE_CLASS}>
            {trait.label}
          </h2>
          <div
            className={`mt-5 grid w-full gap-3.5 px-2 ${
              trait.options.length === 4
                ? "max-w-[20rem] grid-cols-2"
                : trait.options.length === 2
                  ? "max-w-[16rem] grid-cols-2 mx-auto"
                  : "max-w-[23.5rem] grid-cols-3"
            }`}
          >
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

    /* ── Description (optional) ── */
    if (isDescriptionSlide) {
      return (
        <div className="flex w-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
          <h2 className={SLIDE_TITLE_CLASS}>
            describe her
          </h2>
          <p className={`mt-1 ${HELPER_CLASS}`}>(optional)</p>
          <div className="mt-4 w-full max-w-[18rem]">
            <textarea
              value={selections.description}
              onChange={(e) => setSelections((p) => ({ ...p, description: e.target.value }))}
              placeholder="add any details you want…"
              rows={8}
              onClick={(e) => e.stopPropagation()}
              className="min-h-52 w-full resize-none rounded-2xl border-[5px] border-white/15 bg-white/5 px-4 py-3 text-base font-[900] lowercase text-white placeholder:text-white/30 outline-none focus:border-neon-yellow transition-colors duration-150"
            />
            <p className={`mt-2 text-center ${HELPER_CLASS}`}>
              i.e. chubby cheeks, freckles, thick mascara
            </p>
          </div>
        </div>
      );
    }

    /* ── Reference image (optional) ── */
    if (isReferenceSlide) {
      return (
        <div className="-mt-2 flex w-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
          <h2 className={SLIDE_TITLE_CLASS}>
            add a reference
          </h2>
          <p className={`mt-1 ${HELPER_CLASS}`}>(optional)</p>
          <div className="mt-4 flex w-full max-w-[10rem] flex-col items-center gap-4">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            {selections.referenceImage ? (
              <div className="w-full">
                <div className="relative w-full overflow-hidden rounded-[1.4rem] border-[3px] border-white/15" style={{ aspectRatio: "3/4" }}>
                  <img src={selections.referenceImage} alt="Reference" className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setSelections((p) => ({ ...p, referenceImage: null })); }}
                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white text-xs font-bold"
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-[1.4rem] border-[3px] border-dashed border-white/15 bg-white/5 transition-colors duration-150 hover:border-white/30" style={{ aspectRatio: "3/4" }}
                >
                  <Upload size={14} strokeWidth={2.5} className="text-white/30" />
                  <span className="text-[11px] font-extrabold lowercase text-white/30">upload image</span>
                </button>
              </div>
            )}
            <div className="w-full space-y-2 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold lowercase text-white/40">strength</span>
                <span className="text-[10px] font-extrabold lowercase text-white/40">{selections.referenceStrength}%</span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={selections.referenceStrength}
                onChange={(e) => { e.stopPropagation(); setSelections((p) => ({ ...p, referenceStrength: Number(e.target.value) })); }}
                onClick={(e) => e.stopPropagation()}
                className="w-full cursor-pointer appearance-none rounded-full"
                style={{ background: `linear-gradient(to right, hsl(var(--neon-yellow)) ${selections.referenceStrength}%, hsl(var(--secondary)) ${selections.referenceStrength}%)` }}
              />
              <p className="text-[10px] font-extrabold lowercase text-white/40">
                (recommended: 50%)
              </p>
            </div>
          </div>
        </div>
      );
    }

    /* ── Create slide ── */
    if (isCreateSlide) {
      const isFirstCharacter = !isLoggedIn || !skipWelcome;
      return (
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!exitFade) advance(); }}
          className="mt-5 flex min-h-[14rem] w-full flex-col items-center justify-center bg-transparent px-4 text-center cursor-pointer"
          disabled={exitFade}
        >
          <h2 className="mx-auto text-center text-[3rem] font-[900] lowercase leading-[1.02] tracking-tight">
            <span className="block whitespace-nowrap text-white">your character</span>
            <span className="block whitespace-nowrap">
              <span className="text-white">is </span>
              <span className="text-gem-green">almost here!</span>
            </span>
          </h2>
          {!isFirstCharacter && (
            <div className="mt-6 flex items-center gap-1.5">
              <Gem size={16} strokeWidth={2.5} className="text-gem-green" />
              <span className="text-sm font-[900] lowercase text-white/40">30 gems</span>
            </div>
          )}
          <p className={`${!isFirstCharacter ? "mt-5" : "mt-6"} text-sm font-extrabold lowercase text-white/40`}>
            tap to continue
          </p>
        </button>
      );
    }

    return null;
  };

  /* ── Cooking content ── */
  const renderCooking = () => {
    if (cookingPhase === "loading") {
      return (
        <div className="flex flex-col items-center w-full">
          <ProgressBarLoader
            duration={COOKING_DURATION}
            phrases={COOKING_PHRASES}
            phraseInterval={5200}
            requireTapToContinue
            expandTapTarget
            onComplete={() => setCookingPhase("success")}
          />
        </div>
      );
    }
    if (cookingPhase === "success" || cookingPhase === "exiting") {
      return (
        <motion.div
          key="cooking-success"
          className="fixed inset-0 z-10 flex flex-col items-center justify-center px-6"
          style={{ background: "hsl(140, 100%, 50%)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: cookingPhase === "exiting" ? 0 : 1 }}
          transition={{ duration: OVERLAY_FADE_DURATION, ease: "easeInOut" }}
        >
          <motion.div
            className="flex min-h-[18rem] flex-col items-center justify-center text-center"
            initial={{ opacity: 0, y: 20, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <p className="text-center text-[3rem] font-[900] lowercase leading-[1.05] tracking-tight text-black">
              <span className="block">character</span>
              <span className="block">created!</span>
            </p>
          </motion.div>
        </motion.div>
      );
    }
    return null;
  };

  const isCooking = cookingPhase !== "none";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: "#000000" }}
    >
      {/* Exit fade overlay */}
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
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >

        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-x-0 flex items-center justify-center px-6 md:px-8" style={{ top: "45%", transform: "translateY(-50%)" }}>
            <div className="w-full max-w-sm mx-auto flex flex-col items-center">
              <AnimatePresence mode="wait" custom={slideDirection}>
                <motion.div
                  key={isCooking ? "cooking" : step}
                  className="w-full"
                  custom={slideDirection}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {isCooking ? renderCooking() : renderSlide()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Fixed bottom nav */}
          {!isCooking && (
            <div className="absolute inset-x-0 flex flex-col items-center px-4" style={{ bottom: "auto", top: "calc(45% + 180px)" }}>
              <div className="mb-3.5 flex h-14 items-center gap-4">
                <motion.div
                  animate={backArrowShaking ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                  transition={{ duration: 0.4 }}
                >
                  <NavArrow direction="left" onClick={goBack} />
                </motion.div>
                <div className="flex flex-col items-center">
                  <NavArrow
                    direction="right"
                    onClick={advance}
                    disabled={!canAdvance && currentTraitIndex >= 0}
                  />
                </div>
              </div>
              <div className="flex items-center justify-center gap-[3px] mb-1" style={{ padding: "0 50px" }}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <div
                    key={i}
                    className="transition-all duration-300"
                    style={{
                      flex: 1,
                      height: 5,
                      borderRadius: 3,
                      background: i <= Math.round((dotCurrent / dotTotal) * 11) ? "#00e0ff" : "rgba(0,224,255,0.1)",
                    }}
                  />
                ))}
              </div>

              {!isLoggedIn && (
                <button
                  type="button"
                  onClick={() => navigateTo(`/auth${window.location.search}`)}
                  className="relative z-50 px-4 py-2 text-[18px] font-[700] lowercase transition-colors duration-150 hover:text-white/60 pointer-events-auto touch-manipulation"
                  style={{ color: "rgba(255,255,255,0.4)", marginTop: 20 }}
                >
                  skip to login
                </button>
              )}
              {isLoggedIn && skipWelcome && (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClose(); }}
                  className="relative z-50 px-4 py-2 text-[18px] font-[700] lowercase transition-colors duration-150 hover:text-white/60 pointer-events-auto touch-manipulation"
                  style={{ color: "rgba(255,255,255,0.4)", marginTop: 20 }}
                >
                  skip
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

/* ── Sign-in overlay (post face selection) ── */
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
    if (user && visible) {
      onSignedIn();
      setVisible(false);
    }
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
    const timer = window.setTimeout(() => {
      window.dispatchEvent(new CustomEvent("vizura:blackout:end"));
    }, 320);

    return () => window.clearTimeout(timer);
  }, [visible]);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: `${window.location.origin}/choose-face`,
      });
      if (result?.error) { toast.error("google sign in failed"); setGoogleLoading(false); }
    } catch (err: any) {
      toast.error(err.message || "sign in failed");
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      toast.error("enter email and password");
      return;
    }
    setEmailLoading(true);
    try {
      if (isSignUp) {
        try {
          await signUp(email.trim(), password);
          toast.success("check your email to confirm");
        } catch (err: any) {
          if (err.message?.toLowerCase().includes("already registered")) {
            await signIn(email.trim(), password);
          } else throw err;
        }
      } else {
        await signIn(email.trim(), password);
      }
    } catch (err: any) {
      toast.error(err.message || "sign in failed");
      setEmailLoading(false);
    }
  };

  if (!visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" style={{ backgroundColor: "#000000" }}>
      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.15, ease: "easeInOut" }}
      >
      <div className="relative z-10 flex flex-col items-center px-8 w-full max-w-xs">
        <div className="flex h-14 items-end justify-center mb-2">
          <BigEmoji emoji="🔐" index={3} />
        </div>
        <h2 className="text-center text-[2.2rem] font-[900] lowercase leading-[0.95] tracking-tight text-white">
          sign in to<br />save her
        </h2>
        <button
          onClick={handleGoogle}
          disabled={googleLoading || emailLoading}
          className="mt-8 w-full h-14 rounded-2xl text-sm font-[900] lowercase tracking-tight flex items-center justify-center gap-2 active:scale-[0.95] disabled:opacity-50 transition-transform duration-150"
          style={{ background: AMBER, color: "hsl(0 0% 0%)" }}
        >
          {googleLoading ? (
            <><Loader2 className="animate-spin" size={18} />connecting...</>
          ) : (
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
          type="email"
          placeholder="email"
          value={email}
          onChange={(e) => { e.stopPropagation(); setEmail(e.target.value); }}
          onClick={(e) => e.stopPropagation()}
          className="mt-4 w-full h-12 rounded-2xl border-2 border-[#1a1a1a] px-4 text-sm font-extrabold lowercase text-white placeholder:text-white/30 outline-none focus:border-white/40 transition-colors duration-150"
          style={{ backgroundColor: "#111111" }}
        />
        <input
          type="password"
          placeholder="password"
          value={password}
          onChange={(e) => { e.stopPropagation(); setPassword(e.target.value); }}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => { if (e.key === "Enter") handleEmailAuth(); }}
          className="mt-2 w-full h-12 rounded-2xl border-[3px] border-white/15 bg-white/5 px-4 text-sm font-extrabold lowercase text-white placeholder:text-white/30 outline-none focus:border-white/40 transition-colors duration-150"
          disabled={emailLoading || googleLoading}
        />
        <button
          onClick={handleEmailAuth}
          disabled={emailLoading || googleLoading}
          className="mt-3 w-full h-14 rounded-2xl border-[5px] border-white/15 bg-white/5 text-sm font-[900] lowercase text-white flex items-center justify-center gap-2 hover:border-white/30 transition-colors duration-150 disabled:opacity-50"
        >
          {emailLoading ? (
            <><Loader2 className="animate-spin" size={18} />signing in...</>
          ) : (
            <>{isSignUp ? "sign up" : "sign in"}<ArrowRight size={18} strokeWidth={2.5} /></>
          )}
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
