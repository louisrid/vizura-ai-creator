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

const TRAITS = [
  { key: "skin", label: "pick her skin…", emoji: "🎨", options: ["pale", "tan", "asian", "dark"] },
  { key: "bodyType", label: "choose her body…", emoji: "📏", options: ["slim", "regular", "curvy"] },
  { key: "chest", label: "choose her chest…", emoji: "👙", options: ["small", "medium", "large"] },
  { key: "hairStyle", label: "pick her hair…", emoji: "✂️", options: ["straight", "curly", "bangs", "short"] },
  { key: "hairColour", label: "pick her hair colour…", emoji: "🖌️", options: ["blonde", "brunette", "black", "pink"] },
  { key: "eye", label: "choose her eyes…", emoji: "👁️", options: ["brown", "blue", "green", "hazel"] },
  { key: "makeup", label: "pick her makeup…", emoji: "💄", options: ["natural", "model", "egirl"] },
] as const;

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

/* ── Background glow — deep blue gradient ── */
const AmbientGlow = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div
      className="absolute rounded-full animate-ambient-drift-1"
      style={{
        width: "90%", height: "80%", top: "5%", left: "0%",
        filter: "blur(160px)",
        background: "radial-gradient(circle, hsl(220 42% 22% / 0.035), hsl(214 28% 16% / 0.02), transparent 70%)",
      }}
    />
    <div
      className="absolute rounded-full animate-ambient-drift-2"
      style={{
        width: "70%", height: "70%", bottom: "0%", right: "-5%",
        filter: "blur(140px)",
        background: "radial-gradient(circle, hsl(226 34% 20% / 0.03), hsl(214 24% 14% / 0.016), transparent 65%)",
      }}
    />
  </div>
);

/* ── Simple emoji — CSS bounce only ── */
const BigEmoji = ({ emoji }: { emoji: string; index?: number }) => (
  <span className="select-none pointer-events-none text-[3.5rem] inline-block animate-bounce" style={{ animationDuration: "2s" }}>
    {emoji}
  </span>
);

/* ── Interactive pill ── */
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
    className={`rounded-xl px-4 py-2.5 text-sm font-[900] lowercase tracking-tight transition-colors duration-75 ${
      selected
        ? "bg-neon-yellow text-neon-yellow-foreground border-[3px] border-neon-yellow shadow-[0_0_16px_hsl(50_100%_50%/0.4)]"
        : "border-[3px] border-white/15 bg-white/5 text-white/70 hover:border-white/30"
    }`}
  >
    {label}
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
  skin: string; bodyType: string; chest: string; hairStyle: string;
  hairColour: string; eye: string; makeup: string;
  characterName: string; age: string;
  description: string;
  referenceImage: string | null;
  referenceStrength: number;
}

const emptySelections: GuidedSelections = {
  skin: "", bodyType: "", chest: "", hairStyle: "",
  hairColour: "", eye: "", makeup: "",
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
  const [summaryShake, setSummaryShake] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [initialFadeIn, setInitialFadeIn] = useState(true);
  const [backArrowShaking, setBackArrowShaking] = useState(false);
  const [detailsToastShown, setDetailsToastShown] = useState(false);
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
      setSelections({ ...emptySelections, ...(saved?.selections ?? {}) });
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
      setSummaryShake(false);
      setInitialFadeIn(!restored);
      setVisible(true);
      setCookingPhase("none");
      setCookingPhraseIndex(0);
      hasCompletedCookingRef.current = false;
      animating.current = false;
      setDetailsToastShown(false);
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

    const handleVisibilitySave = () => {
      if (document.visibilityState === "hidden") {
        persistFlow();
        return;
      }
      if (document.visibilityState === "visible") {
        restoreSavedFlow();
      }
    };

    const handlePageHide = () => persistFlow();
    const handlePageShow = () => restoreSavedFlow();
    const handleWindowFocus = () => restoreSavedFlow();

    document.addEventListener("visibilitychange", handleVisibilitySave);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.body.style.overflow = prev.body;
      document.documentElement.style.overflow = prev.html;
      if (root) root.style.overflow = prev.root;
      document.removeEventListener("visibilitychange", handleVisibilitySave);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [visible, persistFlow, restoreSavedFlow]);

  const completeCookingFlow = useCallback(() => {
    if (hasCompletedCookingRef.current) return;
    hasCompletedCookingRef.current = true;
    sessionStorage.removeItem(FLOW_STATE_KEY);
    onComplete(selectionsRef.current);
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
  const isDetailsA = internalStep === 9;
  const isDetailsB = internalStep === 10;
  const isDetailsC = internalStep === 11;
  const isCreateSlide = internalStep === 12;
  const currentTraitIndex = internalStep >= 2 && internalStep <= 8 ? internalStep - 2 : -1;
  const isSkinSlide = currentTraitIndex === 0;

  const getCurrentTraitKey = (): TraitKey | null => {
    if (currentTraitIndex < 0 || currentTraitIndex >= 7) return null;
    return TRAITS[currentTraitIndex].key;
  };

  const isCurrentSelected = () => {
    const key = getCurrentTraitKey();
    if (!key) return true;
    return !!selections[key];
  };

  const setTrait = (key: TraitKey, value: string) => {
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

  const RANDOM_NAMES = ["luna","ivy","mia","zara","nova","aria","lily","jade","ruby","ella","cleo","skye","maya","lola","nina","sara","rose","nora","kira","dana","lexi","tara","zoey","emma","anna","eva","gia","mila","vera","ayla"];
  const randomiseName = useCallback(() => {
    const name = RANDOM_NAMES[Math.floor(Math.random() * RANDOM_NAMES.length)];
    setSelections((p) => ({ ...p, characterName: name }));
    if (!detailsToastShown) {
      setDetailsToastShown(true);
      toast("great choice!");
    }
  }, [detailsToastShown]);
  const randomiseAge = useCallback(() => {
    const age = String(Math.floor(Math.random() * 23) + 18);
    setSelections((p) => ({ ...p, age }));
    if (!detailsToastShown) {
      setDetailsToastShown(true);
      toast("great choice!");
    }
  }, [detailsToastShown]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSelections((p) => ({ ...p, referenceImage: url }));
  };

  const advance = useCallback(() => {
    if (animating.current || cookingPhase !== "none") return;

    if (currentTraitIndex >= 0 && currentTraitIndex < 7) {
      const key = TRAITS[currentTraitIndex].key;
      if (!selectionsRef.current[key]) {
        triggerShake();
        return;
      }
    }

    if (isDetailsA) {
      const s = selectionsRef.current;
      const missingName = !s.characterName.trim();
      const ageNum = Number(s.age);
      const invalidAge = !s.age || ageNum < 18 || ageNum > 40;
      if (missingName || invalidAge) {
        setSummaryShake(true);
        setTimeout(() => setSummaryShake(false), 500);
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
  }, [step, isDetailsA, isCreateSlide, cookingPhase, currentTraitIndex]);

  const goBack = useCallback(() => {
    if (animating.current || cookingPhase !== "none") return;
    if (step <= 0) {
      // Shake the back arrow on first slide
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

  const canAdvance = isWelcomeSlide || isIntroSlide || isCurrentSelected() || isDetailsA || isDetailsB || isDetailsC || isCreateSlide;  

  // Show "great choice!" toast once when name and age are both filled
  useEffect(() => {
    if (detailsToastShown) return;
    if (isDetailsA && selections.characterName.trim() && selections.age) {
      const ageNum = Number(selections.age);
      if (ageNum >= 18 && ageNum <= 40) {
        setDetailsToastShown(true);
        toast("great choice!");
      }
    }
  }, [isDetailsA, selections.characterName, selections.age, detailsToastShown]);

  const preventSubmit = useCallback((e: React.FormEvent) => { e.preventDefault(); }, []);

  if (!mounted || !visible) return null;

  // Consistent fade transitions for all slides
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
            <BouncyWords text="welcome to" className="block text-[1.4rem] font-[800]" delayStart={0.2} />
            <motion.span
              className="block text-[5.5rem] font-[900] leading-[0.95]"
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
          <h2 className="mt-2 text-center text-[2rem] font-[900] lowercase leading-[0.95] tracking-tight text-white">
            time to create your<br />first character!
          </h2>
          <p className="mt-3 text-sm font-extrabold lowercase text-white/40">tap to continue</p>
        </div>
      );
    }

    /* ── Trait slides ── */
    if (currentTraitIndex >= 0) {
      const trait = TRAITS[currentTraitIndex];
      const selectedVal = selections[trait.key];
      return (
        <div className="flex w-full flex-col items-center">
          <div className="flex h-14 items-end justify-center">
            <BigEmoji emoji={trait.emoji} index={currentTraitIndex + 1} />
          </div>
          <h2 className="mt-2 text-center text-[2.2rem] font-[900] lowercase leading-[0.95] tracking-tight text-white">
            {trait.label}
          </h2>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {trait.options.map((opt) => (
              <InteractivePill
                key={opt}
                label={opt}
                selected={selectedVal === opt}
                shaking={shaking && selectedVal !== opt}
                onClick={() => setTrait(trait.key, opt)}
              />
            ))}
          </div>
          {/* Helper text on skin slide only */}
          {isSkinSlide && (
            <p className="mt-4 text-xs font-extrabold lowercase text-white/30">
              click any option to select
            </p>
          )}
        </div>
      );
    }

    /* ── Details A: summary pills + name + age ── */
    if (isDetailsA) {
      return (
        <div className="flex w-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-center text-[2.2rem] font-[900] lowercase leading-[0.95] tracking-tight text-white">
            add the details…
          </h2>
          <div className="mt-4 flex flex-wrap justify-center gap-1.5">
            {TRAITS.map((t) => {
              const v = selections[t.key];
              if (!v) return null;
              return (
                <span key={t.key} className="rounded-xl bg-neon-yellow px-3 py-1.5 text-xs font-[900] lowercase text-neon-yellow-foreground">
                  {v}
                </span>
              );
            })}
          </div>
          <div className="mt-5 flex items-center gap-2 w-full max-w-[16rem]">
            <motion.input
              animate={summaryShake && !selections.characterName.trim() ? { x: [0, -6, 6, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
              value={selections.characterName}
              onChange={(e) => setSelections((p) => ({ ...p, characterName: e.target.value }))}
              placeholder="character name…"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); advance(); } }}
              className="h-12 flex-1 min-w-0 rounded-2xl border-[5px] border-white/15 bg-white/5 px-4 text-sm font-[900] lowercase text-white placeholder:text-white/30 outline-none focus:border-neon-yellow transition-colors"
            />
            <motion.button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); randomiseName(); }}
              whileTap={{ scale: 0.85, rotate: 180 }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-[3px] border-white/20 bg-white text-black active:bg-white/70 transition-colors"
            >
              <RefreshCw size={16} strokeWidth={2.5} />
            </motion.button>
          </div>
          <div className="mt-3 flex items-center gap-2 w-full max-w-[16rem]">
            <motion.input
              animate={summaryShake && (!selections.age || Number(selections.age) < 18 || Number(selections.age) > 40) ? { x: [0, -6, 6, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
              type="number"
              min={18}
              max={40}
              value={selections.age}
              onChange={(e) => {
                const v = e.target.value;
                if (v === "" || (Number(v) >= 1 && Number(v) <= 99)) {
                  setSelections((p) => ({ ...p, age: v }));
                }
              }}
              placeholder="age (18-40)"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); advance(); } }}
              className="h-12 flex-1 min-w-0 rounded-2xl border-[5px] border-white/15 bg-white/5 px-4 text-sm font-[900] lowercase text-white placeholder:text-white/30 outline-none focus:border-neon-yellow transition-colors"
            />
            <motion.button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); randomiseAge(); }}
              whileTap={{ scale: 0.85, rotate: 180 }}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-[3px] border-white/20 bg-white text-black active:bg-white/70 transition-colors"
            >
              <RefreshCw size={16} strokeWidth={2.5} />
            </motion.button>
          </div>
        </div>
      );
    }

    /* ── Details B: description textarea ── */
    if (isDetailsB) {
      return (
        <div className="flex w-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-center text-[2.2rem] font-[900] lowercase leading-[0.95] tracking-tight text-white">
            describe her…
          </h2>
          <p className="mt-1 text-sm font-extrabold lowercase text-white/40">(optional)</p>
          <div className="mt-4 w-full max-w-[18rem]">
            <textarea
              value={selections.description}
              onChange={(e) => setSelections((p) => ({ ...p, description: e.target.value }))}
              placeholder="add any details you want to see…"
              rows={8}
              onClick={(e) => e.stopPropagation()}
              className="min-h-52 w-full resize-none rounded-2xl border-[5px] border-white/15 bg-white/5 px-4 py-3 text-sm font-[900] lowercase text-white placeholder:text-white/30 outline-none focus:border-neon-yellow transition-colors"
            />
            <p className="mt-2 text-center text-xs font-extrabold lowercase leading-snug text-white/30">
              i.e. she has chubby cheeks, freckles and extremely thick mascara
            </p>
          </div>
        </div>
      );
    }

    /* ── Details C: reference image ── */
    if (isDetailsC) {
      return (
        <div className="flex w-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-center text-[2.2rem] font-[900] lowercase leading-[0.95] tracking-tight text-white">
            add a reference…
          </h2>
          <p className="mt-1 text-sm font-extrabold lowercase text-white/40">(optional)</p>
          <div className="mt-5 w-full max-w-[16rem]">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            {selections.referenceImage ? (
              <div className="flex flex-col gap-3">
                <div className="relative w-full h-32 rounded-2xl overflow-hidden border-[3px] border-white/15">
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
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-[3px] border-dashed border-white/15 bg-white/5 py-8 hover:border-white/30 transition-colors"
                >
                  <Upload size={24} strokeWidth={2.5} className="text-white/30" />
                  <span className="text-xs font-extrabold lowercase text-white/30">add reference image</span>
                </button>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-[10px] font-extrabold lowercase text-white/50">strength</span>
              <span className="text-[10px] font-extrabold lowercase text-white/50">{selections.referenceStrength}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={selections.referenceStrength}
              onChange={(e) => { e.stopPropagation(); setSelections((p) => ({ ...p, referenceStrength: Number(e.target.value) })); }}
              onClick={(e) => e.stopPropagation()}
              className="mt-2 w-full cursor-pointer appearance-none rounded-full"
              style={{ background: `linear-gradient(to right, hsl(var(--neon-yellow)) ${selections.referenceStrength}%, hsl(var(--secondary)) ${selections.referenceStrength}%)` }}
            />
            <p className="mt-2 text-[10px] font-extrabold lowercase text-white/30">
              (recommended: 50%)
            </p>
          </div>
        </div>
      );
    }

    /* ── Create slide ── */
    if (isCreateSlide) {
      const showGemCost = isLoggedIn && skipWelcome;
      return (
        <div
          className="mt-5 flex min-h-[14rem] w-full flex-col items-center justify-center bg-transparent px-4 text-center"
        >
          {showGemCost && (
            <div className="mb-4 flex items-center gap-1.5">
              <Gem size={16} strokeWidth={2.5} className="text-gem-green" />
              <span className="text-sm font-[900] lowercase text-white/60">30 gems</span>
            </div>
          )}
          <span className="mb-4 inline-block select-none text-[3rem] leading-none animate-bounce" style={{ animationDuration: "2s" }}>👀</span>
          <h2 className="max-w-[18rem] text-center text-[2.6rem] font-[900] lowercase leading-[0.95] tracking-tight text-white">
            <span className="block">your character is</span>
            <span className="block">almost here!</span>
          </h2>
          <motion.p
            className="mt-4 text-sm font-extrabold lowercase text-white/40"
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

  /* ── Cooking content (inside same overlay) ── */
  const renderCooking = () => {
    if (cookingPhase === "loading") {
      return (
        <motion.div
          key="cooking-loading"
          className="flex flex-col items-center w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: OVERLAY_FADE_DURATION, ease: "easeInOut" }}
        >
          <ProgressBarLoader
            duration={COOKING_DURATION}
            phrases={COOKING_PHRASES}
            phraseInterval={3500}
            onComplete={() => setCookingPhase("success")}
          />
        </motion.div>
      );
    }
    if (cookingPhase === "success" || cookingPhase === "exiting") {
      return (
        <motion.div
          key="cooking-success"
          className="fixed inset-0 z-10 flex flex-col items-center justify-center bg-black px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: cookingPhase === "exiting" ? 0 : 1 }}
          transition={{ duration: OVERLAY_FADE_DURATION, ease: "easeInOut" }}
        >
          <div className="flex min-h-[18rem] flex-col items-center justify-center gap-5 text-center">
            <motion.span
              className="inline-block select-none text-[7rem] leading-none"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.45, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
            >
              ✅
            </motion.span>
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <p className="text-center text-[2.8rem] font-[900] lowercase leading-[1.05] text-white">
                <span className="block">character</span>
                <span className="block">created!</span>
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
      style={{ background: "linear-gradient(160deg, hsl(220 20% 4.4%) 0%, hsl(224 18% 3.5%) 48%, hsl(0 0% 0%) 100%)" }}
    >
      <AmbientGlow />
      {/* Foreground fades in, background is instant */}
      <motion.div
        className="absolute inset-0 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: initialFadeIn ? OVERLAY_FADE_DURATION : SLIDE_FADE_DURATION }}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
        onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); }}
      >
        {/* Close / exit button — top right, hidden during cooking */}
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
          <div className="absolute inset-x-0 flex items-center justify-center px-8" style={{ top: isCooking ? "50%" : "45%", transform: "translateY(-50%)" }}>
            <div className="w-full max-w-xs mx-auto flex flex-col items-center">
              {isCooking ? (
                <AnimatePresence mode="wait">
                  {renderCooking()}
                </AnimatePresence>
              ) : (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    className="w-full"
                    initial={slideTransition.initial}
                    animate={slideTransition.animate}
                    exit={slideTransition.exit}
                    transition={slideTransition.transition}
                  >
                    {renderSlide()}
                  </motion.div>
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Fixed bottom nav - hidden during cooking */}
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
        redirect_uri: `${window.location.origin}/account?redirect=${encodeURIComponent("/choose-face")}`,
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
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    >
      <AmbientGlow />
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
    </motion.div>,
    document.body,
  );
};

export default GuidedCreator;
