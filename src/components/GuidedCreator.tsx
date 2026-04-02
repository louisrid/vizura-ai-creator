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
const NEON_BLUE = "hsl(var(--gem-green))";
const PURE_WHITE = "hsl(var(--foreground))";
const AMBER = "hsl(var(--neon-yellow))";
const FLOW_STATE_KEY = "vizura_guided_flow_state";
const SLIDE_FADE_DURATION = 0.55;
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
  { key: "skin", label: "choose skin tone", emoji: "🎨", options: ["white", "tan", "asian", "black"] },
  { key: "bodyType", label: "choose body shape", emoji: "👙", options: ["slim", "average", "curvy"] },
  { key: "age", label: "choose her age", emoji: "🎂", options: ["18-23", "24-28", "29+"] },
  { key: "hairStyle", label: "choose hairstyle", emoji: "✂️", options: ["curly", "straight", "bangs"] },
  { key: "hairColour", label: "choose hair colour", emoji: "🖌️", options: ["blonde", "brunette", "black", "pink"] },
  { key: "eye", label: "choose eye colour", emoji: "👁️", options: ["brown", "blue", "green"] },
  { key: "makeup", label: "choose her makeup", emoji: "💄", options: ["natural", "classic", "egirl"] },
] as const;

const SLIDE_TITLE_CLASS = "mt-3 text-center text-[2.35rem] font-[900] lowercase leading-[0.95] tracking-tight text-white";
const SUBTEXT_CLASS = "text-sm font-extrabold lowercase text-white/40";
const HELPER_CLASS = "text-[11px] font-[800] lowercase text-white/40";

type TraitKey = (typeof TRAITS)[number]["key"];

/* ── Dots ── */
const Dots = forwardRef<HTMLDivElement, { current: number; total: number }>(({ current, total }, ref) => (
  <div ref={ref} className="flex items-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="rounded-full transition-all duration-300"
        style={{
          width: i === current ? 10 : 8,
          height: i === current ? 10 : 8,
          background: i === current ? NEON_BLUE : PURE_WHITE,
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
    className={`flex h-14 w-14 items-center justify-center active:scale-[1.05] ${className || ""}`}
    style={{
      backgroundColor: direction === "right" ? NEON_BLUE : "transparent",
      border: direction === "left" ? `5px solid ${PURE_WHITE}` : `5px solid ${NEON_BLUE}`,
      borderRadius: 16,
      outline: "none",
      padding: 0,
      cursor: "pointer",
      opacity: 1,
      transition: "transform 0.05s",
    }}
  >
    {direction === "left" ? (
      <ArrowLeft size={22} strokeWidth={2.75} style={{ color: PURE_WHITE }} />
    ) : (
      <ArrowRight size={22} strokeWidth={2.5} style={{ color: "hsl(0 0% 0%)" }} />
    )}
  </button>
));
NavArrow.displayName = "NavArrow";

/* ── Solid background only ── */
const AmbientGlow = () => null;

/* ── Simple emoji — CSS bounce only ── */
const BigEmoji = ({ emoji }: { emoji: string; index?: number }) => (
  <span className="select-none pointer-events-none text-[3.5rem] inline-block animate-bounce" style={{ animationDuration: "2s" }}>
    {emoji}
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
        ? { scale: [1, 1.15, 1], transition: { duration: 0.1 } }
        : shaking
          ? { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.25 } }
          : {}
    }
    className={`flex h-16 w-full items-center justify-center rounded-[1.35rem] px-5 text-[1.05rem] font-[900] lowercase tracking-tight transition-colors duration-75 ${
      selected
        ? "bg-neon-yellow text-neon-yellow-foreground border-[4px] border-neon-yellow shadow-[0_0_16px_hsl(50_100%_50%/0.4)]"
        : "border-[4px] border-white/15 bg-white/5 text-white/70 hover:border-white/30"
    }`}
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
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [initialFadeIn, setInitialFadeIn] = useState(true);
  const [backArrowShaking, setBackArrowShaking] = useState(false);
  const [nameToastShown, setNameToastShown] = useState(false);
  const animating = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [cookingPhase, setCookingPhase] = useState<"none" | "loading" | "success" | "exiting">("none");
  const [cookingPhraseIndex, setCookingPhraseIndex] = useState(0);
  const hasCompletedCookingRef = useRef(false);

  useEffect(() => setMounted(true), []);

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
      setCookingPhase("loading");
      return;
    }

    animating.current = true;
    const nextStep = step + 1;
    if (nextStep >= TOTAL) return;
    setStep(nextStep);
    setTimeout(() => { animating.current = false; }, 180);
  }, [step, isNameSlide, isCreateSlide, cookingPhase, currentTraitIndex, TOTAL]);

  const goBack = useCallback(() => {
    if (animating.current || cookingPhase !== "none") return;
    if (step <= 0) {
      setBackArrowShaking(true);
      setTimeout(() => setBackArrowShaking(false), 500);
      return;
    }
    animating.current = true;
    setStep((s) => s - 1);
    setTimeout(() => { animating.current = false; }, 180);
  }, [step, cookingPhase]);

  const handleClose = () => {
    sessionStorage.removeItem(FLOW_STATE_KEY);
    setVisible(false);
    onExit(selectionsRef.current);
  };

  const canAdvance = isWelcomeSlide || isIntroSlide || isNameSlide || isDescriptionSlide || isReferenceSlide || isCreateSlide || (currentTraitIndex >= 0 && isCurrentTraitSelected());

  const preventSubmit = useCallback((e: React.FormEvent) => { e.preventDefault(); }, []);

  if (!mounted || !visible) return null;

  const slideTransition = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: SLIDE_FADE_DURATION, ease: "easeInOut" as const },
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
              className="h-14 flex-1 min-w-0 rounded-2xl border-[5px] border-white/15 bg-white/5 px-4 text-base font-[900] lowercase text-white placeholder:text-white/30 outline-none focus:border-neon-yellow transition-colors"
            />
            <motion.button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); randomiseName(); }}
              whileTap={{ scale: 0.85, rotate: 180 }}
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-[3px] border-white/20 bg-white text-black active:bg-white/70 transition-colors"
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
      const isMakeup = trait.key === "makeup";
      const isBody = trait.key === "bodyType";
      const isAge = trait.key === "age";
      return (
        <div className="flex w-full flex-col items-center">
          <div className="flex h-14 items-end justify-center">
            <BigEmoji emoji={trait.emoji} index={currentTraitIndex + 1} />
          </div>
          <h2 className={SLIDE_TITLE_CLASS}>
            {trait.label}
          </h2>
          <div
            className={`mt-5 grid w-full gap-3.5 px-2 ${trait.options.length === 4 ? "max-w-[20rem] grid-cols-2" : "max-w-[23.5rem] grid-cols-3"}`}
          >
            {trait.options.map((opt) => (
              <div key={opt} className="flex flex-col items-center gap-1">
                <InteractivePill
                  label={opt}
                  selected={selectedVal === opt}
                  shaking={shaking && selectedVal !== opt}
                  onClick={() => setTrait(trait.key, opt)}
                />
                {isMakeup && opt === "classic" && (
                  <span className={`${HELPER_CLASS} mt-0.5`}>(recommended)</span>
                )}
                {isBody && opt === "average" && (
                  <span className={`${HELPER_CLASS} mt-0.5`}>(recommended)</span>
                )}
              </div>
            ))}
          </div>
          {isSkinSlide && (
            <p className="mt-4 text-sm font-extrabold lowercase text-white/40">
              tap to select
            </p>
          )}
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
          <p className={`mt-1 ${SUBTEXT_CLASS}`}>(optional)</p>
          <div className="mt-4 w-full max-w-[18rem]">
            <textarea
              value={selections.description}
              onChange={(e) => setSelections((p) => ({ ...p, description: e.target.value }))}
              placeholder="add any details you want…"
              rows={8}
              onClick={(e) => e.stopPropagation()}
              className="min-h-52 w-full resize-none rounded-2xl border-[5px] border-white/15 bg-white/5 px-4 py-3 text-base font-[900] lowercase text-white placeholder:text-white/30 outline-none focus:border-neon-yellow transition-colors"
            />
            <p className={`mt-2 text-center ${SUBTEXT_CLASS}`}>
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
          <p className={`mt-1 ${SUBTEXT_CLASS}`}>(optional)</p>
          <div className="mt-5 flex w-full max-w-[12.5rem] flex-col items-center gap-5">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            {selections.referenceImage ? (
              <div className="w-full">
                <div className="relative w-full overflow-hidden rounded-[1.6rem] border-[3px] border-white/15" style={{ aspectRatio: "3/4" }}>
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
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-[1.6rem] border-[3px] border-dashed border-white/15 bg-white/5 transition-colors hover:border-white/30" style={{ aspectRatio: "3/4" }}
                >
                  <Upload size={15} strokeWidth={2.5} className="text-white/30" />
                  <span className="text-sm font-extrabold lowercase text-white/30">add reference image</span>
                </button>
              </div>
            )}
            <div className="w-full space-y-2.5 pt-1">
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
        <div className="mt-5 flex min-h-[14rem] w-full flex-col items-center justify-center bg-transparent px-4 text-center">
          <span className="mb-5 inline-block select-none text-[3rem] leading-none animate-bounce" style={{ animationDuration: "2s" }}>👀</span>
          <h2 className="mx-auto w-full max-w-[16rem] text-center text-[3rem] font-[900] lowercase leading-[0.96] tracking-tight">
            <span className="block text-white">your character</span>
            <span className="block">
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
          <motion.p
            className={`${!isFirstCharacter ? "mt-5" : "mt-6"} text-sm font-extrabold lowercase text-white/40`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: SLIDE_FADE_DURATION }}
          >
            tap anywhere to continue
          </motion.p>
        </div>
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
          style={{ background: "hsl(var(--member-green))" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: cookingPhase === "exiting" ? 0 : 1 }}
          transition={{ duration: OVERLAY_FADE_DURATION, ease: "easeInOut" }}
        >
          <div className="flex min-h-[18rem] flex-col items-center justify-center gap-5 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <p className="text-center text-[3rem] font-[900] lowercase leading-[1.05] tracking-tight text-black">
                character created!
              </p>
            </motion.div>
          </div>
        </motion.div>
      );
    }
    return null;
  };

  const isCooking = cookingPhase !== "none";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: "hsl(0 0% 0%)" }}
    >
      <AmbientGlow />
      <motion.div
        className="absolute inset-0 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: initialFadeIn ? OVERLAY_FADE_DURATION : SLIDE_FADE_DURATION }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        {/* Close / exit button */}
        {!isCooking && isLoggedIn && skipWelcome && (
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleClose(); }}
            className="absolute top-4 right-4 z-20 flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-white hover:bg-white/20 transition-colors active:scale-95"
            aria-label="close"
          >
            <X size={18} strokeWidth={2.5} />
          </button>
        )}

        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-x-0 flex items-center justify-center px-6 md:px-8" style={{ top: "45%", transform: "translateY(-50%)" }}>
            <div className="w-full max-w-sm mx-auto flex flex-col items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={isCooking ? "cooking" : step}
                  className="w-full"
                  initial={slideTransition.initial}
                  animate={slideTransition.animate}
                  exit={slideTransition.exit}
                  transition={slideTransition.transition}
                >
                  {isCooking ? renderCooking() : renderSlide()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Fixed bottom nav */}
          {!isCooking && (
            <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: "76%" }}>
              <div className="mb-4 flex h-14 items-center gap-4">
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
              <div className="flex h-3 items-center">
                <Dots current={dotCurrent} total={dotTotal} />
              </div>

              {!isLoggedIn && (
                <button
                  type="button"
                  onClick={() => navigateTo(`/auth${window.location.search}`)}
                  className="relative z-50 mt-5 px-4 py-2 text-xs font-extrabold lowercase text-white/40 underline transition-colors hover:text-white/60 pointer-events-auto touch-manipulation"
                >
                  skip to login
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
  const { user, autoSignIn } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [visible, setVisible] = useState(false);

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

  const handleAutoSignIn = async () => {
    setAutoLoading(true);
    try {
      await autoSignIn();
    } catch (err: any) {
      toast.error(err.message || "sign in failed");
      setAutoLoading(false);
    }
  };

  if (!visible) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black">
      <AmbientGlow />
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
          disabled={googleLoading || autoLoading}
          className="mt-8 w-full h-14 rounded-2xl text-sm font-[900] lowercase tracking-tight flex items-center justify-center gap-2 active:scale-[0.95] disabled:opacity-50"
          style={{ background: AMBER, color: "hsl(0 0% 0%)", transition: "transform 0.05s" }}
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
        <button
          onClick={handleAutoSignIn}
          disabled={autoLoading || googleLoading}
          className="mt-4 w-full h-14 rounded-2xl border-[5px] border-white/15 bg-white/5 text-sm font-[900] lowercase text-white flex items-center justify-center gap-2 hover:border-white/30 transition-colors disabled:opacity-50"
        >
          {autoLoading ? (
            <><Loader2 className="animate-spin" size={18} />signing in...</>
          ) : (
            <>continue<ArrowRight size={18} strokeWidth={2.5} /></>
          )}
        </button>
      </div>
      </motion.div>
    </div>,
    document.body,
  );
};

export default GuidedCreator;
