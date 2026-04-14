import { useState, useCallback, useEffect, useRef, forwardRef } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, RefreshCw, Gem } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/components/ui/sonner";
import { readCachedOnboardingState } from "@/lib/onboardingState";

/* ── Constants ── */
const Y = "#ffe603";
const FLOW_STATE_KEY = "facefox_guided_flow_state";
const SLIDE_FADE_DURATION = 0.2;
const OVERLAY_FADE_DURATION = 0.75;

/* ── Name toast ── */
const getRandomNameToast = () => "great choice";

/*
 * SCREEN ORDER (11 screens, internalStep 0-10):
 *  0: Hero (new first screen with rings)
 *  1: Intro
 *  2: Name input
 *  3-9: Traits (skin, body type, bust size, age, hair colour, hairstyle, eyes)
 *  10: Create
 */

const TRAITS = [
  { key: "skin", label: "choose skin tone", emoji: "🎨", options: ["asian", "black", "tan", "white"] },
  { key: "bodyType", label: "choose body type", emoji: "⌛", options: ["thin", "regular", "curvy"], defaultOption: "regular" },
  { key: "bustSize", label: "choose size", emoji: "👙", options: ["regular", "large"], defaultOption: "regular" },
  { key: "age", label: "choose her age", emoji: "🎂", options: ["18-24", "24+"] },
  { key: "hairColour", label: "choose hair colour", emoji: "🖌️", options: ["ginger", "black", "pink", "brown", "blonde"] },
  { key: "hairStyle", label: "choose hairstyle", emoji: "✂️", options: ["wavy", "straight", "bangs"] },
  { key: "eye", label: "choose eye colour", emoji: "👁️", options: ["brown", "blue", "green"] },
] as const;

type TraitKey = (typeof TRAITS)[number]["key"];

/* ── Shared styles ── */
const SLIDE_TITLE_CLASS = "text-center text-[32px] md:text-[44px] font-[900] lowercase leading-[1.05] tracking-tight text-white";
const HELPER_CLASS = "text-[10px] md:text-[12px] font-[800] lowercase" + " " + "text-muted-foreground";

/* ── Top yellow line (used on hero only) ── */
const TopLine = () => (
  <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] h-[5px] overflow-hidden">
    <svg
      aria-hidden="true"
      className="block h-full w-full"
      preserveAspectRatio="none"
      viewBox="0 0 100 5"
    >
      <defs>
        <linearGradient id="guided-top-line-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: "hsl(var(--neon-yellow))", stopOpacity: 1 }} />
          <stop offset="20%" style={{ stopColor: "hsl(var(--neon-yellow))", stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: "hsl(var(--neon-yellow))", stopOpacity: 0.3 }} />
          <stop offset="80%" style={{ stopColor: "hsl(var(--neon-yellow))", stopOpacity: 0 }} />
        </linearGradient>
      </defs>
      <rect x="0" y="0" width="100" height="5" fill="url(#guided-top-line-gradient)" />
    </svg>
  </div>
);

/* ── Animated rings (hero only) ── */
const AnimatedRings = ({ t }: { t: number }) => (
  <div className="relative flex items-center justify-center w-[280px] h-[280px] md:w-[380px] md:h-[380px] mb-[18px] md:mb-[24px]">
    {/* Inner ring */}
    <div className="absolute w-[150px] h-[150px] md:w-[200px] md:h-[200px] rounded-full" style={{
      border: `2px solid ${Y}`, borderLeftColor: "transparent",
      transform: `rotate(${t * 1.2}deg)`,
      top: "50%", left: "50%", translate: "-50% -50%",
    }} />
    {/* Mid ring */}
    <div className="absolute w-[200px] h-[200px] md:w-[270px] md:h-[270px] rounded-full" style={{
      border: `8px solid ${Y}`, borderTopColor: "transparent", borderRightColor: "transparent",
      transform: `rotate(${t * -0.8}deg)`,
      top: "50%", left: "50%", translate: "-50% -50%",
    }} />
    {/* Outer ring */}
    <div className="absolute w-[245px] h-[245px] md:w-[330px] md:h-[330px] rounded-full" style={{
      border: `3px solid ${Y}`, borderBottomColor: "transparent", borderLeftColor: "transparent",
      transform: `rotate(${t * 0.6}deg)`,
      top: "50%", left: "50%", translate: "-50% -50%",
    }} />
    {/* Dashed ring */}
    <div className="absolute w-[278px] h-[278px] md:w-[375px] md:h-[375px] rounded-full" style={{
      border: `2px dashed ${Y}`,
      transform: `rotate(${t * -0.4}deg)`,
      top: "50%", left: "50%", translate: "-50% -50%",
    }} />
    <span className="text-[82px] md:text-[110px] relative z-[1]">🦊</span>
  </div>
);

/* ── Nav arrow (cyan/blue style) ── */
const NavArrow = forwardRef<HTMLButtonElement, { direction: "left" | "right"; onClick: () => void; disabled?: boolean; colorOverride?: string }>(
  ({ direction, onClick, disabled, colorOverride }, ref) => {
    const isForward = direction === "right";
    const fillColor = colorOverride || "#ffe603";
    return (
      <button
        ref={ref}
        type="button"
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
        disabled={disabled}
        className="flex items-center justify-center active:opacity-70 transition-opacity duration-150 w-[62px] h-[62px] md:w-[78px] md:h-[78px]"
        style={{
          borderRadius: 10,
          backgroundColor: isForward ? fillColor : "#000000",
          border: isForward ? "none" : `2px solid ${fillColor}`,
          outline: "none", padding: 0, cursor: "pointer",
          color: isForward ? "#000" : fillColor,
        }}
      >
        {direction === "left" ? (
          <svg width="22" height="18" viewBox="0 0 20 16" fill="none" className="md:w-[28px] md:h-[22px]">
            <path d="M8 1L1.5 8L8 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="2" y1="8" x2="18.5" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="22" height="18" viewBox="0 0 20 16" fill="none" className="md:w-[28px] md:h-[22px]">
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
    className="flex w-full items-center justify-center h-[62px] md:h-[73px] text-[19px] md:text-[22px]"
    style={{
      borderRadius: 10,
      padding: "11px 26px",
      fontWeight: 900,
      textTransform: "lowercase",
      letterSpacing: "-0.01em",
      transition: "background-color 0.15s ease-out, color 0.15s ease-out, border-color 0.15s ease-out",
      ...(selected
        ? { backgroundColor: Y, color: "#000", border: `2px solid ${Y}` }
        : { backgroundColor: "hsl(var(--card))", color: "#fff", border: "2px solid hsl(var(--border-mid))" }
      ),
    }}
  >
    <span className="block leading-none text-center whitespace-nowrap">{label}</span>
  </motion.button>
);

/* ── Types ── */
export interface GuidedSelections {
  skin: string; bodyType: string; bustSize: string; hairStyle: string;
  hairColour: string; eye: string;
  characterName: string; age: string;
  description: string;
  referenceImage: string | null;
  referenceStrength: number;
}

const emptySelections: GuidedSelections = {
  skin: "", bodyType: "", bustSize: "", hairStyle: "", hairColour: "", eye: "",
  characterName: "", age: "", description: "",
  referenceImage: null, referenceStrength: 50,
};

interface GuidedCreatorProps {
  open: boolean;
  onComplete: (selections: GuidedSelections) => void;
  onExit: (partialSelections: Partial<GuidedSelections>) => void;
  skipWelcome?: boolean;
}

const TOTAL_FULL = 11;
const TOTAL_SKIP = 9;

const ageRangeToNumber = (range: string): string => {
  switch (range) {
    case "18-24": return "18";
    case "24+": return "24";
    default: return "18";
  }
};

const RANDOM_NAMES = ["luna","ivy","mia","zara","nova","aria","lily","jade","ruby","ella","cleo","skye","maya","lola","nina","sara","rose","nora","kira","dana","lexi","tara","zoey","emma","anna","eva","gia","mila","vera","ayla"];

const normaliseLegacySelections = (partial: Partial<GuidedSelections>): Partial<GuidedSelections> => ({
  ...partial,
  skin: partial.skin === "pale" ? "white" : partial.skin === "dark" ? "black" : partial.skin,
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
  
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const [ringT, setRingT] = useState(0);

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
    if (!visible) return;
    sessionStorage.setItem(FLOW_STATE_KEY, JSON.stringify({ step: stepRef.current, selections: selectionsRef.current, skipWelcome }));
  }, [visible, skipWelcome]);

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
    sessionStorage.removeItem(FLOW_STATE_KEY);
    const final = { ...selectionsRef.current };
    final.age = ageRangeToNumber(final.age);
    onComplete(final);
  }, [onComplete]);

  const internalStep = step + offset;
  const isHeroSlide = internalStep === 0 && !skipWelcome;
  const isIntroSlide = internalStep === 1 && !skipWelcome;
  const isNameSlide = internalStep === 2;
  const isCreateSlide = internalStep === 10;

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


  const advance = useCallback(() => {
    if (animating.current) return;
    toast.dismiss();
    if (isNameSlide && !selectionsRef.current.characterName.trim()) { triggerShake(); return; }
    if (currentTraitIndex >= 0 && currentTraitIndex < TRAITS.length) {
      const key = TRAITS[currentTraitIndex].key;
      if (!selectionsRef.current[key as keyof GuidedSelections]) { triggerShake(); return; }
    }
    if (isCreateSlide) {
      window.dispatchEvent(new CustomEvent("facefox:blackout:start"));
      setExitFade(true);
      window.setTimeout(() => {
        completeCookingFlow();
      }, 600);
      return;
    }
    animating.current = true;
    setSlideDirection(1);
    const nextStep = step + 1;
    if (nextStep >= TOTAL) return;
    // Delay step change slightly so layout doesn't jump before exit animation
    requestAnimationFrame(() => {
      setStep(nextStep);
      setTimeout(() => { animating.current = false; }, 250);
    });
  }, [step, isNameSlide, isCreateSlide, currentTraitIndex, TOTAL, completeCookingFlow]);

  const goBack = useCallback(() => {
    if (animating.current) return;
    if (step <= 0) { setBackArrowShaking(true); setTimeout(() => setBackArrowShaking(false), 500); return; }
    animating.current = true;
    setSlideDirection(-1);
    setStep((s) => s - 1);
    setTimeout(() => { animating.current = false; }, 200);
  }, [step]);

  const handleClose = () => {
    // User left before completing — clear all progress so next open starts fresh
    sessionStorage.removeItem(FLOW_STATE_KEY);
    setStep(0);
    setSelections({ ...emptySelections });
    setVisible(false);
    onExit(selectionsRef.current);
  };

  const canAdvance = isHeroSlide || isIntroSlide || isNameSlide || isCreateSlide || (currentTraitIndex >= 0 && isCurrentTraitSelected());

  if (!mounted || !visible) return null;

  const slideVariants = {
    enter: () => ({ opacity: 0 }),
    center: { opacity: 1 },
    exit: () => ({ opacity: 0 }),
  };

  /* ── HERO SLIDE (new first screen) ── */
  const renderHero = () => (
    <div className="flex w-full flex-col items-center" style={{ marginTop: 0 }}>
      <AnimatedRings t={ringT} />
      <div className="text-[60px] md:text-[80px]" style={{ fontWeight: 900, color: "#fff", textTransform: "lowercase" as const, letterSpacing: "-0.03em", lineHeight: 1 }}>facefox</div>
      <div className="w-[40px] md:w-[56px] h-[4px] md:h-[5px]" style={{ background: Y, marginTop: 8, marginBottom: 0, borderRadius: 3 }} />
      <div className="flex flex-col items-center mt-5 md:mt-7 gap-2 md:gap-3">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); advance(); }}
          className="w-[168px] md:w-[220px] py-[10px] md:py-[14px] text-[22px] md:text-[26px]"
          style={{
            background: Y, border: "none", borderRadius: 10,
            fontWeight: 900, color: "#000", textTransform: "lowercase" as const,
            cursor: "pointer",
          }}
        >
          start now
        </button>
        {!isLoggedIn && (
          <button
            type="button"
            onClick={() => navigateTo(`/auth${window.location.search}`)}
            className="w-[168px] md:w-[220px] py-[8px] md:py-[12px] text-[22px] md:text-[26px]"
            style={{
              background: "#000000", border: "2px solid #ffe603",
              borderRadius: 10, fontWeight: 900, color: "#ffffff",
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
        <motion.span className="text-[64px] md:text-[86px] mb-5 md:mb-7 inline-block" animate={{ y: [0, -8, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>💫</motion.span>
        <h2 className={SLIDE_TITLE_CLASS}>time to create your<br />first character!</h2>
        <motion.p
          className="mt-5 text-[13px] md:text-[15px] font-[800] lowercase"
          style={{ color: "#ffffff" }}
          animate={{ y: [0, -4, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
        >tap → to continue</motion.p>
      </div>
    );

    /* Name */
    if (isNameSlide) return (
      <div className="flex w-full flex-col items-center" onClick={(e) => e.stopPropagation()}>
        <motion.span className="text-[64px] md:text-[86px] mb-5 md:mb-7 inline-block" animate={{ y: [0, -8, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>✨</motion.span>
        <h2 className={SLIDE_TITLE_CLASS}>give her a name</h2>
        <div className="mt-6 md:mt-8 flex items-center gap-2.5 w-full max-w-[17rem] md:max-w-[22rem]">
          <motion.input
            animate={shaking && !selections.characterName.trim() ? { x: [0, -6, 6, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
            value={selections.characterName}
            onChange={(e) => updateCharacterName(e.target.value)}
            placeholder="type a name…"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); advance(); } }}
            className="h-[56px] md:h-[66px] flex-1 min-w-0 px-4 text-[17px] md:text-[20px] font-[900] lowercase text-white placeholder:text-white/30 outline-none transition-colors duration-150"
            style={{ borderRadius: 10, border: "2px solid hsl(var(--border-mid))", backgroundColor: "hsl(var(--card))" }}
          />
          <motion.button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); randomiseName(); }}
            whileTap={{ scale: 0.85, rotate: 180 }}
            className="flex h-[56px] w-[56px] md:h-[66px] md:w-[66px] shrink-0 items-center justify-center text-black active:opacity-70 transition-opacity duration-150"
            style={{ borderRadius: 10, backgroundColor: Y }}
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
          <motion.span className="text-[64px] md:text-[86px] mb-5 md:mb-7 inline-block" animate={{ y: [0, -8, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}>{trait.emoji}</motion.span>
          <h2 className={SLIDE_TITLE_CLASS}>{trait.label}</h2>
          {trait.options.length === 5 ? (
            <div className="mt-6 md:mt-8 px-2 mx-auto max-w-[26rem] md:max-w-[33rem]">
              {/* Row 1: first 3 items centred */}
              <div className="flex justify-center gap-3.5 md:gap-4 mb-3.5 md:mb-4">
                {trait.options.slice(0, 3).map((opt) => (
                  <div key={opt} className="flex flex-col items-center gap-1" style={{ width: "calc(33.333% - 10px)" }}>
                    <InteractivePill
                      label={opt}
                      selected={selectedVal === opt}
                      shaking={shaking && selectedVal !== opt}
                      onClick={() => setTrait(trait.key, opt)}
                    />
                    {"defaultOption" in trait && (trait as any).defaultOption === opt && (
                      <span className={`${HELPER_CLASS} mt-1.5`}>(recommended)</span>
                    )}
                  </div>
                ))}
              </div>
              {/* Row 2: last 2 items centred */}
              <div className="flex justify-center gap-3.5 md:gap-4">
                {trait.options.slice(3).map((opt) => (
                  <div key={opt} className="flex flex-col items-center gap-1" style={{ width: "calc(33.333% - 10px)" }}>
                    <InteractivePill
                      label={opt}
                      selected={selectedVal === opt}
                      shaking={shaking && selectedVal !== opt}
                      onClick={() => setTrait(trait.key, opt)}
                    />
                    {"defaultOption" in trait && (trait as any).defaultOption === opt && (
                      <span className={`${HELPER_CLASS} mt-1.5`}>(recommended)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className={`mt-6 md:mt-8 grid w-full gap-3.5 md:gap-4 px-2 mx-auto ${
              trait.options.length === 4 ? "max-w-[24rem] md:max-w-[31rem] grid-cols-2"
                : trait.options.length === 2 ? "max-w-[20rem] md:max-w-[25rem] grid-cols-2"
                : "max-w-[24rem] md:max-w-[31rem] grid-cols-3"
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
                    <span className={`${HELPER_CLASS} mt-1.5`}>(recommended)</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      );
    }


    /* Create slide */
    if (isCreateSlide) {
      return (
        <div className="flex min-h-[14rem] w-full flex-col items-center justify-center bg-transparent px-4 text-center">
          <h2
            className="mx-auto text-center text-[3rem] md:text-[4rem] font-[900] lowercase leading-[1.05] tracking-tight mt-12"
          >
            <span className="block text-white">your character</span>
            <span className="block"><span className="text-white">is </span><span className="text-gem-green">almost here!</span></span>
          </h2>
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!exitFade) advance(); }}
            disabled={exitFade}
            className="mt-10 w-full max-w-[17rem] h-14 text-xl font-[900] lowercase transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            style={{ backgroundColor: "#050a10", color: "#ffffff", borderRadius: 10, border: "2px solid #00e0ff" }}
          >
            create <span style={{ color: "#00e0ff" }}>•</span> 1 <Gem size={15} strokeWidth={2.5} style={{ color: "#00e0ff" }} />
          </button>
        </div>
      );
    }

    return null;
  };

  const showNavigation = !isHeroSlide;
  const canExitFlow = skipWelcome && isLoggedIn;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex flex-col" style={{ background: "#000", overflow: "hidden", touchAction: "none", overscrollBehavior: "none" }}>
      {isHeroSlide && <TopLine />}
      {/* Exit fade — smooth fade-out of content, black always behind */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-50 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: exitFade ? 1 : 0 }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
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
        <div
          className={`absolute inset-x-0 flex items-center justify-center px-6 md:px-12 ${showNavigation ? "top-20 bottom-44 md:top-24 md:bottom-40" : "inset-y-0"}`}
          style={{ paddingTop: isHeroSlide ? "5%" : undefined }}
        >
          <div className="w-full max-w-sm md:max-w-lg mx-auto flex flex-col items-center md:-translate-y-[2vh]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                className="w-full"
                variants={slideVariants}
                initial="enter" animate="center" exit="exit"
                transition={{ duration: isCreateSlide ? 0.5 : 0.35, ease: "easeInOut" }}
              >
                {renderSlide()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom nav — only on non-hero slides */}
        {showNavigation && (
          <div className="absolute inset-x-0 flex flex-col items-center px-4" style={{ top: 0, paddingTop: "max(env(safe-area-inset-top), 16px)" }}>
            {(() => {
              const dashCount = skipWelcome ? TOTAL : TOTAL - 1;
              const activeIndex = skipWelcome ? step : step - 1;
              return (
                <div className="flex items-center justify-center gap-[3px] md:gap-[5px] w-full max-w-[280px] md:max-w-sm mx-auto">
                  {Array.from({ length: dashCount }).map((_, i) => (
                    <div key={i} className="transition-all duration-300 h-[4px] md:h-[6px]" style={{
                      flex: 1, borderRadius: 2,
                      background: i <= activeIndex ? Y : "rgba(250,204,21,0.1)",
                    }} />
                  ))}
                </div>
              );
            })()}
          </div>
        )}

        {/* Arrow buttons + home icon — positioned below content */}
        {showNavigation && (
          <div className="absolute inset-x-0 flex flex-col items-center" style={{ bottom: "max(env(safe-area-inset-bottom, 0px), 6%)" }}>
            <div className="flex items-center justify-center gap-4 md:gap-6">
              <motion.div animate={backArrowShaking ? { x: [0, -6, 6, -4, 4, 0] } : {}} transition={{ duration: 0.4 }}>
                <NavArrow direction="left" onClick={goBack} />
              </motion.div>
              <NavArrow direction="right" onClick={advance} disabled={!canAdvance && currentTraitIndex >= 0} colorOverride={isCreateSlide ? "#00e0ff" : undefined} />
            </div>
            {/* Home exit icon — hidden during trait selection & create slides */}
            {currentTraitIndex < 0 && !isCreateSlide && (
              <button
                type="button"
                onClick={handleClose}
                className="mt-10 flex items-center justify-center active:opacity-70 transition-opacity duration-150"
                aria-label="go home"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 10.5L12 3l9 7.5" />
                  <path d="M5 9.5V20a1 1 0 0 0 1 1h4v-5h4v5h4a1 1 0 0 0 1-1V9.5" />
                </svg>
              </button>
            )}
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
  const { user, signIn, signUp, signInPreview } = useAuth();
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
    const timer = window.setTimeout(() => { window.dispatchEvent(new CustomEvent("facefox:blackout:end")); }, 320);
    return () => window.clearTimeout(timer);
  }, [visible]);

  const handleGoogle = async () => {
    setGoogleLoading(true);
    sessionStorage.setItem("facefox_post_auth_home", "1");
    sessionStorage.setItem("facefox_resume_url", window.location.pathname);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
        extraParams: { prompt: "select_account" },
      });
      if (result?.error) {
        sessionStorage.removeItem("facefox_post_auth_home");
        toast.error("sign in error");
        setGoogleLoading(false);
        return;
      }
    } catch (err: any) {
      sessionStorage.removeItem("facefox_post_auth_home");
      toast.error("sign in error");
      setGoogleLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) { toast.error("fill details"); return; }
    setEmailLoading(true);
    try {
      if (isSignUp) {
        try { await signUp(email.trim(), password); toast.success("check email"); }
        catch (err: any) {
          if (err.message?.toLowerCase().includes("already registered")) await signIn(email.trim(), password);
          else throw err;
        }
      } else { await signIn(email.trim(), password); }
    } catch (err: any) { toast.error("try again"); setEmailLoading(false); }
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
        <div className="relative z-10 flex flex-col items-center px-8 w-full max-w-xs md:max-w-sm">
          <span className="text-[64px] mb-5">🔐</span>
          <h2 className="text-center text-[2.2rem] font-[900] lowercase leading-[1.05] tracking-tight text-white">
            sign in to<br />save her
          </h2>
          <div className="mt-8 w-full rounded-[10px] border-2 border-[hsl(var(--card))] p-5 space-y-3" style={{ backgroundColor: "hsl(var(--card))" }}>
            <button
              onClick={handleGoogle}
              disabled={googleLoading || emailLoading}
              className="w-full h-14 flex items-center justify-center gap-2 active:scale-[0.95] disabled:opacity-50 transition-transform duration-150"
              style={{ background: Y, color: "#000", borderRadius: 10, fontSize: 14, fontWeight: 900, textTransform: "lowercase", border: "none" }}
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

            <div className="flex items-center gap-3">
              <div className="flex-1 h-[2px] bg-white/10" />
              <span className="text-[11px] font-extrabold lowercase text-white/30">or use email</span>
              <div className="flex-1 h-[2px] bg-white/10" />
            </div>

            <input
              type="email" placeholder="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-12 px-4 text-base font-extrabold lowercase text-white placeholder:text-white/30 outline-none transition-colors duration-150 focus:border-neon-yellow"
              style={{ borderRadius: 10, border: "2px solid #2a2a2a", backgroundColor: "#2a2a2a" }}
              disabled={emailLoading || googleLoading}
            />
            <input
              type="password" placeholder="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === "Enter") handleEmailAuth(); }}
              className="w-full h-12 px-4 text-base font-extrabold lowercase text-white placeholder:text-white/30 outline-none transition-colors duration-150 focus:border-neon-yellow"
              style={{ borderRadius: 10, border: "2px solid #2a2a2a", backgroundColor: "#2a2a2a" }}
              disabled={emailLoading || googleLoading}
            />

            <button
              onClick={handleEmailAuth}
              disabled={emailLoading || googleLoading}
              className="w-full h-14 text-sm font-[900] lowercase text-neon-yellow-foreground flex items-center justify-center gap-2 transition-all disabled:opacity-50 bg-neon-yellow hover:opacity-90"
              style={{ borderRadius: 10 }}
            >
              {emailLoading ? <><Loader2 className="animate-spin" size={18} />signing in...</> : <>{isSignUp ? "sign up" : "sign in"}<ArrowRight size={14} /></>}
            </button>

            <button
              type="button"
              onClick={() => setIsSignUp((v) => !v)}
              className="w-full text-center text-[11px] font-extrabold lowercase text-white/30 hover:text-muted-foreground transition-colors duration-150"
            >
              {isSignUp ? "already have an account? " : "no account? "}
              <span className="underline">{isSignUp ? "sign in" : "sign up"}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={async () => {
              setEmailLoading(true);
              sessionStorage.setItem("facefox_post_auth_home", "1");
              try {
                await signInPreview();
                toast.success("signed in");
              } catch (err: any) {
                toast.error("try again");
                setEmailLoading(false);
              }
            }}
            disabled={emailLoading || googleLoading}
            className="mt-3 w-full text-center text-[11px] font-extrabold lowercase text-white/25 hover:text-muted-foreground transition-colors duration-150 disabled:opacity-50"
          >
            just browsing? <span className="underline">preview without account</span>
          </button>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
};

export default GuidedCreator;
