import { useState, useCallback, useEffect, useRef, forwardRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, ArrowLeft, ArrowRight, Loader2, RefreshCw, Upload, Gem } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/components/ui/sonner";
import { useNavigate } from "react-router-dom";

/* ── Constants ── */
const NEON_BLUE = "hsl(var(--gem-green))";
const PURE_WHITE = "hsl(var(--foreground))";
const AMBER = "hsl(var(--neon-yellow))";
const FLOW_STATE_KEY = "vizura_guided_flow_state";

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

const emojiMotions = [
  { y: [0, -18, 0], rotate: [0, 6, -4, 0], scale: [1, 1.12, 1], duration: 2.0 },
  { y: [0, -14, 4, 0], rotate: [0, -10, 8, 0], scale: [1, 1.08, 0.96, 1], duration: 2.2 },
  { y: [0, -16, 0], x: [0, 6, -6, 0], scale: [1, 1.1, 1], duration: 2.4 },
  { y: [0, -20, 2, 0], rotate: [0, 12, -8, 0], scale: [1, 1.1, 0.95, 1], duration: 1.8 },
  { y: [0, -12, 0], rotate: [0, -6, 10, -4, 0], scale: [1, 1.08, 1], duration: 2.6 },
  { y: [0, -16, 4, 0], rotate: [0, -8, 6, 0], scale: [1, 1.1, 1], duration: 2.2 },
  { y: [0, -18, 0], rotate: [0, 8, -6, 0], scale: [1, 1.12, 1], duration: 2.0 },
  { y: [0, -14, 0], rotate: [0, -5, 5, 0], scale: [1, 1.06, 1], duration: 2.3 },
];

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
const NavArrow = forwardRef<HTMLButtonElement, { direction: "left" | "right"; onClick: () => void; disabled?: boolean }>(({ direction, onClick, disabled }, ref) => (
  <button
    ref={ref}
    type="button"
    onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!disabled) onClick(); }}
    className="flex h-14 w-14 items-center justify-center active:scale-[1.05]"
    style={{
      backgroundColor: direction === "right" ? NEON_BLUE : "transparent",
      border: direction === "left" ? `5px solid ${PURE_WHITE}` : `5px solid ${NEON_BLUE}`,
      borderRadius: 16,
      outline: "none",
      padding: 0,
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.3 : 1,
      transition: "transform 0.05s, opacity 0.2s",
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

/* ── Background glow — subtle purple aurora ── */
const AmbientGlow = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <motion.div
      className="absolute rounded-full blur-[160px]"
      style={{
        width: "90%", height: "80%", top: "5%", left: "0%",
        background: "radial-gradient(circle, hsl(270 70% 35% / 0.45), hsl(240 80% 22% / 0.28), transparent 70%)",
      }}
      animate={{ x: [0, 80, -40, 30, -60, 10, 0], y: [0, -60, 30, -40, 50, -20, 0], scale: [1, 1.2, 0.85, 1.15, 0.9, 1.1, 1] }}
      transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
    />
    <motion.div
      className="absolute rounded-full blur-[140px]"
      style={{
        width: "70%", height: "70%", bottom: "0%", right: "-5%",
        background: "radial-gradient(circle, hsl(220 70% 28% / 0.38), hsl(260 60% 25% / 0.22), transparent 65%)",
      }}
      animate={{ x: [0, -70, 50, -30, 45, -15, 0], y: [0, 40, -50, 30, -35, 15, 0], scale: [1, 0.8, 1.18, 0.85, 1.12, 0.95, 1] }}
      transition={{ duration: 28, repeat: Infinity, ease: "linear" }}
    />
    <motion.div
      className="absolute rounded-full blur-[180px]"
      style={{
        width: "60%", height: "60%", top: "25%", left: "25%",
        background: "radial-gradient(circle, hsl(280 60% 38% / 0.3), hsl(200 60% 25% / 0.18), transparent 60%)",
      }}
      animate={{ x: [0, 45, -35, 20, -40, 25, 0], y: [0, -35, 25, -20, 15, -30, 0], scale: [0.85, 1.12, 0.88, 1.1, 0.92, 1.05, 0.85] }}
      transition={{ duration: 32, repeat: Infinity, ease: "linear" }}
    />
  </div>
);

/* ── Bouncing emoji ── */
const BigEmoji = ({ emoji, index }: { emoji: string; index: number }) => {
  const m = emojiMotions[index % emojiMotions.length];
  return (
    <span className="select-none pointer-events-none text-[3.5rem]">
      <motion.span
        className="inline-block"
        animate={{ y: m.y, x: (m as any).x, rotate: m.rotate, scale: m.scale }}
        transition={{ duration: m.duration, repeat: Infinity, ease: "easeInOut" }}
      >
        {emoji}
      </motion.span>
    </span>
  );
};

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
  "mixing the pixels…",
  "adjusting the vibe…",
  "picking the perfect look…",
  "almost there…",
  "adding the finishing touches…",
  "brewing something beautiful…",
  "calibrating cuteness…",
  "loading your masterpiece…",
];
const COOKING_PHRASE_INTERVAL = 1500;
const COOKING_DURATION = 8000;
const COOKING_SUCCESS_HOLD = 5000;

const CookingGreenTick = () => (
  <motion.svg
    width="80" height="80" viewBox="0 0 80 80" fill="none"
    initial={{ opacity: 0, scale: 0.6 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
  >
    <motion.circle cx="40" cy="40" r="36" stroke="hsl(140, 100%, 50%)" strokeWidth="3.5" fill="none"
      initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 1.2, ease: "easeOut" }} />
    <motion.path d="M24 42 L34 52 L56 30" stroke="hsl(140, 100%, 50%)" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
      initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ duration: 0.8, delay: 1.0, ease: "easeOut" }} />
  </motion.svg>
);

const CookingSpinner = () => {
  const dotCount = 12;
  return (
    <div className="relative h-20 w-20">
      {Array.from({ length: dotCount }).map((_, i) => {
        const angle = (360 / dotCount) * i;
        const delay = (i / dotCount) * 1.8;
        return (
          <motion.div key={i} className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full"
            style={{ marginLeft: -5, marginTop: -5, transform: `rotate(${angle}deg) translateY(-32px)` }}
            animate={{
              backgroundColor: ["hsl(40, 100%, 55%)", "hsl(185, 100%, 55%)", "hsl(140, 100%, 50%)", "hsl(40, 100%, 55%)"],
              scale: [0.6, 1, 0.6], opacity: [0.3, 1, 0.3],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut", delay }}
          />
        );
      })}
    </div>
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

/*
 * Slide layout:
 *  0 = welcome
 *  1 = intro
 *  2-8 = 7 trait slides
 *  9 = details A (summary pills + name/age)
 * 10 = details B (description textarea)
 * 11 = details C (reference image)
 * 12 = create button
 *
 * After create: internal "cooking" phase (loading → success → navigate)
 */
const TOTAL = 13;

const GuidedCreator = ({ open, onComplete, onExit, skipWelcome = false }: GuidedCreatorProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isLoggedIn = !!user;

  // When skipWelcome, internal steps still 0-12 but we start at 2 and hide first 2 dots
  const minStep = skipWelcome ? 2 : 0;

  const [step, setStep] = useState(minStep);
  const dotTotal = skipWelcome ? TOTAL - 2 : TOTAL;
  const dotCurrent = skipWelcome ? step - 2 : step;
  const [selections, setSelections] = useState<GuidedSelections>({ ...emptySelections });
  const [shaking, setShaking] = useState(false);
  const [summaryShake, setSummaryShake] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [initialFadeIn, setInitialFadeIn] = useState(true);
  const animating = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Internal cooking phase - replaces separate CreationLoadingOverlay
  const [cookingPhase, setCookingPhase] = useState<"none" | "loading" | "success">("none");
  const [cookingPhraseIndex, setCookingPhraseIndex] = useState(0);

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
      const restoredMinStep = saved?.skipWelcome ? 2 : 0;
      setStep(Math.max(saved?.step ?? restoredMinStep, restoredMinStep));
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
      animating.current = false;
    }
  }, [open, restoreSavedFlow]);

  useEffect(() => {
    persistFlow();
  }, [persistFlow, step, selections]);

  useEffect(() => {
    if (!visible || !initialFadeIn) return;
    const t = setTimeout(() => setInitialFadeIn(false), 1800);
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

  // Cooking phase timers
  useEffect(() => {
    if (cookingPhase !== "loading") return;
    const interval = setInterval(() => {
      setCookingPhraseIndex((i) => (i + 1) % COOKING_PHRASES.length);
    }, COOKING_PHRASE_INTERVAL);
    return () => clearInterval(interval);
  }, [cookingPhase]);

  useEffect(() => {
    if (cookingPhase !== "loading") return;
    const t = setTimeout(() => setCookingPhase("success"), COOKING_DURATION);
    return () => clearTimeout(t);
  }, [cookingPhase]);

  useEffect(() => {
    if (cookingPhase !== "success") return;
    const t = setTimeout(() => {
      sessionStorage.removeItem(FLOW_STATE_KEY);
      onComplete(selectionsRef.current);
    }, COOKING_SUCCESS_HOLD);
    return () => clearTimeout(t);
  }, [cookingPhase]);

  const isWelcomeSlide = step === 0;
  const isIntroSlide = step === 1;
  const isDetailsA = step === 9;
  const isDetailsB = step === 10;
  const isDetailsC = step === 11;
  const isCreateSlide = step === 12;
  const currentTraitIndex = step >= 2 && step <= 8 ? step - 2 : -1;

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
  }, []);
  const randomiseAge = useCallback(() => {
    const age = String(Math.floor(Math.random() * 23) + 18);
    setSelections((p) => ({ ...p, age }));
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setSelections((p) => ({ ...p, referenceImage: url }));
  };

  const advance = useCallback(() => {
    if (animating.current || cookingPhase !== "none") return;

    // Trait slides require selection
    if (currentTraitIndex >= 0 && currentTraitIndex < 7) {
      const key = TRAITS[currentTraitIndex].key;
      if (!selectionsRef.current[key]) {
        triggerShake();
        return;
      }
    }

    // Details A requires name + age
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

    // Create slide → start cooking inside same overlay
    if (isCreateSlide) {
      setCookingPhase("loading");
      return;
    }

    animating.current = true;
    setStep((s) => Math.min(s + 1, TOTAL - 1));
    setTimeout(() => { animating.current = false; }, 80);
  }, [step, isDetailsA, isCreateSlide, cookingPhase, currentTraitIndex]);

  const goBack = useCallback(() => {
    if (animating.current || step <= minStep || cookingPhase !== "none") return;
    animating.current = true;
    setStep((s) => s - 1);
    setTimeout(() => { animating.current = false; }, 80);
  }, [step, cookingPhase]);

  const handleSkipToLogin = () => {
    sessionStorage.removeItem(FLOW_STATE_KEY);
    setVisible(false);
    navigate("/auth?redirect=/");
  };

  const canAdvance = isWelcomeSlide || isIntroSlide || isCurrentSelected() || isDetailsA || isDetailsB || isDetailsC || isCreateSlide;

  // Prevent any form submissions from causing page reload
  const preventSubmit = useCallback((e: React.FormEvent) => { e.preventDefault(); }, []);

  if (!mounted || !visible) return null;

  const slideTransition = {
    initial: { opacity: 0, x: 30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
    transition: { duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  };

  const renderSlide = () => {
    /* ── Welcome ── */
    if (isWelcomeSlide) {
      return (
        <div className="flex w-full flex-col items-center">
          <h2 className="mt-1 text-center lowercase leading-tight tracking-tight text-white">
            <span className="block text-[1.4rem] font-[800]">welcome to</span>
            <span className="block text-[4.2rem] font-[900] leading-[0.95]">vizura!</span>
          </h2>
          <p className="mt-3 text-sm font-extrabold lowercase text-white/40">tap to continue</p>
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
          <h2 className="mt-2 text-center text-[2rem] font-[900] lowercase leading-tight tracking-tight text-white">
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
          <h2 className="mt-2 text-center text-[2.2rem] font-[900] lowercase leading-tight tracking-tight text-white">
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
        </div>
      );
    }

    /* ── Details A: summary pills + name + age ── */
    if (isDetailsA) {
      return (
        <div className="flex w-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-center text-[2.2rem] font-[900] lowercase leading-tight tracking-tight text-white">
            add the details…
          </h2>
          {/* Trait summary pills */}
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
          {/* Name input */}
          <div className="mt-5 flex items-center gap-2 w-full max-w-[16rem]">
            <motion.input
              animate={summaryShake && !selections.characterName.trim() ? { x: [0, -6, 6, -4, 4, 0] } : {}}
              transition={{ duration: 0.4 }}
              value={selections.characterName}
              onChange={(e) => setSelections((p) => ({ ...p, characterName: e.target.value }))}
              placeholder="character name…"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); advance(); } }}
              className="h-12 flex-1 min-w-0 rounded-2xl border-[5px] border-white/15 bg-white/5 px-4 text-sm font-[900] lowercase text-white placeholder:text-white/30 outline-none focus:border-white/40 transition-colors"
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
          {/* Age input */}
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
              className="h-12 flex-1 min-w-0 rounded-2xl border-[5px] border-white/15 bg-white/5 px-4 text-sm font-[900] lowercase text-white placeholder:text-white/30 outline-none focus:border-white/40 transition-colors"
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
          <h2 className="text-center text-[2.2rem] font-[900] lowercase leading-tight tracking-tight text-white">
            describe her…
          </h2>
          <div className="mt-5 w-full max-w-[18rem]">
            <textarea
              value={selections.description}
              onChange={(e) => setSelections((p) => ({ ...p, description: e.target.value }))}
              placeholder="add any details you want to see…"
              rows={8}
              onClick={(e) => e.stopPropagation()}
              className="min-h-52 w-full resize-none rounded-2xl border-[5px] border-white/15 bg-white/5 px-4 py-3 text-sm font-[900] lowercase text-white placeholder:text-white/30 outline-none focus:border-white/40 transition-colors"
            />
          </div>
        </div>
      );
    }

    /* ── Details C: reference image ── */
    if (isDetailsC) {
      return (
        <div className="flex w-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
          <h2 className="text-center text-[2.2rem] font-[900] lowercase leading-tight tracking-tight text-white">
            add a reference…
          </h2>
          <p className="mt-1 text-sm font-extrabold lowercase text-white/40">(optional)</p>
          <div className="mt-5 w-full max-w-[16rem]">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            {selections.referenceImage ? (
              <div className="flex flex-col gap-2">
                <div className="relative w-full h-32 rounded-2xl overflow-hidden border-[3px] border-white/15">
                  <img src={selections.referenceImage} alt="Reference" className="h-full w-full object-cover" />
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelections((p) => ({ ...p, referenceImage: null })); }}
                    className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white text-xs font-bold"
                  >
                    ×
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold lowercase text-white/50">strength</span>
                  <span className="text-[10px] font-extrabold lowercase text-white/50">{selections.referenceStrength}%</span>
                </div>
                <input
                  type="range" min={0} max={100}
                  value={selections.referenceStrength}
                  onChange={(e) => { e.stopPropagation(); setSelections((p) => ({ ...p, referenceStrength: Number(e.target.value) })); }}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full accent-neon-yellow h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, hsl(var(--neon-yellow)) ${selections.referenceStrength}%, hsl(0 0% 20%) ${selections.referenceStrength}%)` }}
                />
              </div>
            ) : (
              <button
                onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-[3px] border-dashed border-white/15 bg-white/5 py-8 hover:border-white/30 transition-colors"
              >
                <Upload size={24} strokeWidth={2.5} className="text-white/30" />
                <span className="text-xs font-extrabold lowercase text-white/30">add reference image</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    /* ── Create slide ── */
    if (isCreateSlide) {
      const showGemCost = isLoggedIn && skipWelcome;
      return (
        <div className="flex w-full flex-col items-center justify-center">
          {showGemCost && (
            <div className="mb-4 flex items-center gap-1.5">
              <Gem size={16} strokeWidth={2.5} className="text-gem-green" />
              <span className="text-sm font-[900] lowercase text-white/60">30 gems</span>
            </div>
          )}
          <motion.button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); advance(); }}
            className="h-16 w-[80vw] max-w-[20rem] rounded-2xl text-lg font-[900] lowercase tracking-tight flex items-center justify-center gap-2"
            style={{ background: AMBER, color: "#000", transition: "transform 0.05s" }}
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            whileTap={{ scale: 0.95 }}
          >
            <Zap size={20} strokeWidth={2.5} />
            create
          </motion.button>
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
          className="flex flex-col items-center gap-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <CookingSpinner />
          <div className="h-8 flex items-center">
            <AnimatePresence mode="wait">
              <motion.p
                key={COOKING_PHRASES[cookingPhraseIndex]}
                className="text-center text-base font-extrabold lowercase text-white"
                initial={{ opacity: 0, y: 12, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              >
                {COOKING_PHRASES[cookingPhraseIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </motion.div>
      );
    }
    if (cookingPhase === "success") {
      return (
        <motion.div
          key="cooking-success"
          className="fixed inset-0 z-10 flex flex-col items-center justify-center gap-6"
          style={{ backgroundColor: "hsl(var(--member-green))" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.svg width="120" height="120" viewBox="0 0 120 120" fill="none"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <motion.circle cx="60" cy="60" r="52" stroke="white" strokeWidth="5" fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.4, ease: "easeOut" }}
            />
            <motion.path d="M34 62 L52 80 L86 42" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.2, delay: 1.2, ease: "easeOut" }}
            />
          </motion.svg>
          <motion.p
            className="text-center text-3xl font-[900] lowercase text-white"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            initial={{ opacity: 0, y: 20, scale: 0.85 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 2.2, ease: [0.34, 1.56, 0.64, 1] }}
          >
            character created!
          </motion.p>
        </motion.div>
      );
    }
    return null;
  };

  const isCooking = cookingPhase !== "none";

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: initialFadeIn ? 1.2 : 0.3 }}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
      onSubmit={(e) => { e.preventDefault(); e.stopPropagation(); }}
    >
      <AmbientGlow />

      <div className="relative flex-1 overflow-hidden">
        <div className="absolute inset-x-0 flex items-center justify-center px-8" style={{ top: isCooking ? "50%" : "44%", transform: "translateY(-50%)" }}>
          <div className="w-full max-w-xs mx-auto flex flex-col items-center">
            <AnimatePresence mode="wait">
              {isCooking ? (
                renderCooking()
              ) : (
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
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Fixed bottom nav - hidden during cooking */}
        {!isCooking && (
          <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: "72%" }}>
            <div className="mb-4 flex h-14 items-center gap-4">
              <NavArrow direction="left" onClick={goBack} disabled={step <= minStep} />
              <NavArrow
                direction="right"
                onClick={advance}
                disabled={!canAdvance && currentTraitIndex >= 0}
              />
            </div>
            <div className="flex h-3 items-center">
              <Dots current={dotCurrent} total={dotTotal} />
            </div>

            {!isLoggedIn && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSkipToLogin(); }}
                className="mt-5 text-xs font-extrabold lowercase text-white/30 underline hover:text-white/50 transition-colors"
              >
                skip to login
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>,
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
      transition={{ duration: 0.7 }}
    >
      <AmbientGlow />
      <div className="relative z-10 flex flex-col items-center px-8 w-full max-w-xs">
        <div className="flex h-14 items-end justify-center mb-2">
          <BigEmoji emoji="🔐" index={3} />
        </div>
        <h2 className="text-center text-[2.2rem] font-[900] lowercase leading-tight tracking-tight text-white">
          sign in to<br />save her
        </h2>
        <button
          onClick={handleGoogle}
          disabled={googleLoading || autoLoading}
          className="mt-8 w-full h-14 rounded-2xl text-sm font-[900] lowercase tracking-tight flex items-center justify-center gap-2 active:scale-[0.95] disabled:opacity-50"
          style={{ background: AMBER, color: "#000", transition: "transform 0.05s" }}
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
