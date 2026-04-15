import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTransitionNavigate } from "@/hooks/useTransitionNavigate";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Loader2, RefreshCw, Gem } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/components/ui/sonner";
import { readCachedOnboardingState } from "@/lib/onboardingState";

/* ── Constants ── */
const Y = "#ffe603";
const FLOW_STATE_KEY = "facefox_guided_flow_state";
const HERO_SEEN_KEY = "facefox_hero_seen";
const SLIDE_FADE_DURATION = 0.2;
const OVERLAY_FADE_DURATION = 0.4;
const FAST_CROSSFADE_MS = 400;
const SLOW_FADE_MS = 500;
const BLACK_HOLD_MS = 100;

const RING_EPOCH = typeof performance !== "undefined" ? performance.now() : Date.now();
const isHeroSeen = () => typeof window !== "undefined" && sessionStorage.getItem(HERO_SEEN_KEY) === "1";
const markHeroSeen = () => { if (typeof window !== "undefined") sessionStorage.setItem(HERO_SEEN_KEY, "1"); };

/* ── Name toast ── */
const getRandomNameToast = () => "great choice";

/*
 * SCREEN ORDER (10 screens, internalStep 0-9):
 *  0: Hero (new first screen with rings)
 *  1: Name input
 *  2-8: Traits (skin, body type, bust size, age, hair colour, hairstyle, eyes)
 *  9: Create
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
const HELPER_CLASS = "text-[9px] md:text-[11px] font-[800] lowercase" + " " + "text-muted-foreground";

/* AnimatedRings removed — rings now inline in renderHero */

/* ── Nav arrow (cyan/blue style) ── */
const NavArrow = ({ direction, onClick, disabled, colorOverride }: { direction: "left" | "right"; onClick: () => void; disabled?: boolean; colorOverride?: string }) => {
    const isForward = direction === "right";
    const fillColor = colorOverride || "#ffe603";
    return (
      <button
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

const TOTAL_FULL = 10;
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
  const navigateTo = useTransitionNavigate();
  const isLoggedIn = !!user;

  const TOTAL = skipWelcome ? TOTAL_SKIP : TOTAL_FULL;
  const offset = skipWelcome ? 1 : 0;

  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<GuidedSelections>({ ...emptySelections });
  const [shaking, setShaking] = useState(false);
  const mounted = typeof document !== "undefined";
  const [visible, setVisible] = useState(open);
  const [initialFadeIn, setInitialFadeIn] = useState(!open);
  const [backArrowShaking, setBackArrowShaking] = useState(false);
  const [nameToastShown, setNameToastShown] = useState(false);
  const animating = useRef(false);
  
  const [ringT, setRingT] = useState(0);
  const [heroPhase, setHeroPhase] = useState(() => isHeroSeen() ? 3 : 0);
  const heroVisited = useRef(isHeroSeen());

  const [exitFade, setExitFade] = useState(false);
  const [heroExiting, setHeroExiting] = useState(false);
  const [loginExiting, setLoginExiting] = useState(false);

  /* Ring animation timer — uses rAF for smooth 60fps */
  useEffect(() => {
    let raf: number;
    const tick = () => {
      const elapsed = (typeof performance !== "undefined" ? performance.now() : Date.now()) - RING_EPOCH;
      setRingT(elapsed * 0.037);
      raf = requestAnimationFrame(tick);
    };
    tick();
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
      setHeroExiting(false);
      setLoginExiting(false);
      setBackArrowShaking(false);
    }
  }, [open, restoreSavedFlow]);

  useEffect(() => { persistFlow(); }, [persistFlow, step, selections]);

  useEffect(() => {
    if (!visible || !initialFadeIn) return;
    const t = setTimeout(() => setInitialFadeIn(false), FAST_CROSSFADE_MS);
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
  const isNameSlide = internalStep === 1;
  const isCreateSlide = internalStep === 9;

  /* Wait for splash screen to be fully removed before starting hero animation */
  const [splashGone, setSplashGone] = useState(() => !document.getElementById("splash-screen"));
  useEffect(() => {
    if (splashGone || !isHeroSlide) return;
    const check = setInterval(() => {
      if (!document.getElementById("splash-screen")) {
        setSplashGone(true);
        clearInterval(check);
      }
    }, 100);
    return () => clearInterval(check);
  }, [isHeroSlide, splashGone]);

  /* Hero phased entrance — only starts after splash is gone; skip on return */
  useEffect(() => {
    if (!isHeroSlide || !splashGone) return;
    if (heroVisited.current || isHeroSeen()) {
      heroVisited.current = true;
      setHeroPhase(3);
      return;
    }
    setHeroPhase(0);
    const ts = [
      setTimeout(() => setHeroPhase(1), 300),
      setTimeout(() => setHeroPhase(2), 650),
      setTimeout(() => { setHeroPhase(3); heroVisited.current = true; markHeroSeen(); }, 1800),
    ];
    return () => ts.forEach(clearTimeout);
  }, [isHeroSlide, splashGone]);

  const currentTraitIndex = internalStep >= 2 && internalStep <= 8 ? internalStep - 2 : -1;


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
    if (animating.current || heroExiting) return;
    toast.dismiss();
    if (isNameSlide && !selectionsRef.current.characterName.trim()) { triggerShake(); return; }
    if (currentTraitIndex >= 0 && currentTraitIndex < TRAITS.length) {
      const key = TRAITS[currentTraitIndex].key;
      if (!selectionsRef.current[key as keyof GuidedSelections]) { triggerShake(); return; }
    }
    if (isCreateSlide) {
      setLoginExiting(true);
      window.setTimeout(() => {
        completeCookingFlow();
      }, FAST_CROSSFADE_MS);
      return;
    }
    // Hero → first slide: fade to black, hold, then reveal next slide
    if (isHeroSlide) {
      animating.current = true;
      heroVisited.current = true; markHeroSeen();
      setHeroExiting(true);
      // Fade out hero content (SLOW_FADE_MS), then hold on pure black (BLACK_HOLD_MS),
      // then set step so new slide fades in
      setTimeout(() => {
        setStep((currentStep) => Math.min(currentStep + 1, TOTAL - 1));
        requestAnimationFrame(() => {
          setHeroExiting(false);
          setTimeout(() => { animating.current = false; }, SLOW_FADE_MS);
        });
      }, SLOW_FADE_MS + BLACK_HOLD_MS);
      return;
    }
    animating.current = true;
    const nextStep = step + 1;
    if (nextStep >= TOTAL) return;
    requestAnimationFrame(() => {
      setStep(nextStep);
      setTimeout(() => { animating.current = false; }, FAST_CROSSFADE_MS);
    });
  }, [step, isNameSlide, isCreateSlide, isHeroSlide, heroExiting, currentTraitIndex, TOTAL, completeCookingFlow]);

  const goBack = useCallback(() => {
    if (animating.current) return;
    heroVisited.current = true; markHeroSeen();
    if (step <= 0) { setBackArrowShaking(true); setTimeout(() => setBackArrowShaking(false), 500); return; }

    // ALL back transitions → TYPE B (fast crossfade), including back to hero
    const goingBackToHero = !skipWelcome && step === 1;
    if (goingBackToHero) {
      setHeroPhase(3); // ensure hero renders in final state immediately
    }

    animating.current = true;
    setStep((s) => s - 1);
    setTimeout(() => { animating.current = false; }, FAST_CROSSFADE_MS);
  }, [step, skipWelcome]);

  const handleClose = () => {
    // User left before completing — clear all progress so next open starts fresh
    sessionStorage.removeItem(FLOW_STATE_KEY);
    setStep(0);
    setSelections({ ...emptySelections });
    setVisible(false);
    onExit(selectionsRef.current);
  };

  const canAdvance = isHeroSlide || isNameSlide || isCreateSlide || (currentTraitIndex >= 0 && isCurrentTraitSelected());

  if (!mounted || !visible) return null;

  const slideVariants = {
    enter: { opacity: 0 },
    center: { opacity: 1 },
    exit: { opacity: 0 },
  };

  /* ── HERO SLIDE (new first screen) ── */
  const renderHero = () => {
    const on = heroPhase >= 2;
    return (
      <div className="flex w-full flex-col items-center" style={{ paddingTop: 10 }}>
        {/* Fox emoji — no sharpening */}
        <div style={{ position: 'relative', width: 320, height: 320, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 18 }}>
          {[
            { size: 318, w: 6, spd: 0.45, del: 0.22, seg: 'borderBottomColor', dash: false },
            { size: 282, w: 2, spd: -0.3, del: 0.14, seg: 'borderLeftColor', dash: true },
            { size: 246, w: 8, spd: -0.6, del: 0.07, seg: 'borderTopColor', dash: false },
            { size: 213, w: 3, spd: 0.5, del: 0, seg: 'borderRightColor', dash: false },
          ].map((r, i) => (
            <div key={i} style={{
              position: 'absolute', borderRadius: '50%',
              width: on ? r.size : 80, height: on ? r.size : 80,
              border: `${r.w}px ${r.dash ? 'dashed' : 'solid'} #ffe603`,
              [r.seg]: 'transparent',
              transform: `rotate(${ringT * r.spd}deg)`,
              opacity: on ? 1 : 0,
              transition: `width 0.7s cubic-bezier(0.34,1.56,0.64,1) ${r.del}s, height 0.7s cubic-bezier(0.34,1.56,0.64,1) ${r.del}s, opacity 0.35s ease ${r.del}s`,
              top: '50%', left: '50%', translate: '-50% -50%',
            }} />
          ))}
          <div style={{ width: 115, height: 115, overflow: 'hidden', opacity: heroPhase >= 1 ? 1 : 0, transition: 'opacity 1.2s ease' }}>
            <img
              src="https://em-content.zobj.net/source/apple/391/fox_1f98a.png"
              alt="fox"
              width={230}
              height={230}
              draggable={false}
              style={{
                display: 'block',
                width: 115,
                height: 115,
              }}
            />
          </div>
        </div>
        <div style={{ fontSize: 76, fontWeight: 900, color: '#fff', textTransform: 'lowercase', letterSpacing: '-0.03em', lineHeight: 1, marginTop: 4, opacity: heroPhase >= 3 ? 1 : 0, transition: 'opacity 0.9s ease' }}>facefox</div>
        <div style={{ width: 195, height: 12, background: '#ffe603', borderRadius: 6, marginTop: 10, marginBottom: 26, opacity: heroPhase >= 3 ? 1 : 0, transition: 'opacity 0.9s ease 0.1s' }} />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, opacity: heroPhase >= 3 ? 1 : 0, transition: 'opacity 0.9s ease' }}>
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); advance(); }} style={{ width: 185, padding: '12px 0', fontSize: 24, fontWeight: 900, background: '#ffe603', border: 'none', borderRadius: 10, color: '#000', textTransform: 'lowercase', cursor: 'pointer', letterSpacing: '-0.02em' }}>start</button>
          {!isLoggedIn && (
            <button type="button" onClick={(e) => {
              e.preventDefault(); e.stopPropagation();
              heroVisited.current = true; markHeroSeen();
              setLoginExiting(true);
              navigateTo(`/auth${window.location.search}`);
              setTimeout(() => {
                setVisible(false);
              }, FAST_CROSSFADE_MS);
            }} style={{ width: 185, padding: '10px 0', fontSize: 24, fontWeight: 900, background: '#000', border: '2px solid #ffe603', borderRadius: 10, color: '#fff', textTransform: 'lowercase', cursor: 'pointer', letterSpacing: '-0.02em' }}>login</button>
          )}
        </div>
      </div>
    );
  };

  /* ── Slide renderer ── */
  const renderSlide = () => {
    if (isHeroSlide) return renderHero();

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
                      <span className={`${HELPER_CLASS} mt-1`}>(recommended)</span>
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
                      <span className={`${HELPER_CLASS} mt-1`}>(recommended)</span>
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
                    <span className={`${HELPER_CLASS} mt-1`}>(recommended)</span>
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
      const cachedState = readCachedOnboardingState(user?.id);
      const isOnboarding = isLoggedIn && cachedState && !cachedState.onboardingComplete;
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
            {isOnboarding ? "create" : (<>create <span style={{ color: "#00e0ff" }}>•</span> 1 <Gem size={15} strokeWidth={2.5} style={{ color: "#00e0ff" }} /></>)}
          </button>
        </div>
      );
    }

    return null;
  };

  const showNavigation = !isHeroSlide;
  const canExitFlow = skipWelcome && isLoggedIn;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{
        background: "#000", overflow: "hidden", touchAction: "none", overscrollBehavior: "none",
        opacity: loginExiting ? 0 : 1,
        transition: `opacity ${FAST_CROSSFADE_MS}ms ease-in-out`,
      }}
    >
      {/* Exit fade — smooth fade-out of content, black always behind */}
      <motion.div
        className="pointer-events-none absolute inset-0 z-50 bg-black"
        initial={{ opacity: 0 }}
        animate={{ opacity: (exitFade || heroExiting) ? 1 : 0 }}
        transition={{ duration: SLOW_FADE_MS / 1000, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute inset-0 flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: initialFadeIn ? OVERLAY_FADE_DURATION : FAST_CROSSFADE_MS / 1000, ease: "easeInOut" }}
      >
        {/* Close button removed — home icon below arrows is the only exit */}
        {/* Skip button removed */}

        {/* Content area */}
        <div
          className="absolute inset-x-0 flex items-center justify-center px-6 md:px-12"
          style={{
            top: isHeroSlide ? 0 : 48,
            bottom: isHeroSlide ? 0 : 160,
          }}
        >
          <div className="grid w-full max-w-sm md:max-w-lg mx-auto">
            <AnimatePresence mode={heroExiting ? "wait" : "sync"} initial={false}>
              <motion.div
                key={step}
                className="w-full [grid-area:1/1]"
                variants={slideVariants}
                initial="enter"
                animate={heroExiting && isHeroSlide ? "exit" : "center"}
                exit="exit"
                transition={{ duration: heroExiting ? SLOW_FADE_MS / 1000 : FAST_CROSSFADE_MS / 1000, ease: "easeInOut" }}
              >
                {renderSlide()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom nav — only on non-hero slides */}
        {showNavigation && (
          <div className="absolute inset-x-0 flex flex-col items-center px-4" style={{ top: 0, paddingTop: "max(env(safe-area-inset-top), 28px)" }}>
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
          <div className="mt-8 w-full rounded-[10px] border-2 border-[hsl(var(--border-mid))] p-5 space-y-3" style={{ backgroundColor: "hsl(var(--card))" }}>
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
              <div className="flex-1 h-[2px]" style={{ backgroundColor: "hsl(var(--border-mid))" }} />
              <span className="text-[11px] font-extrabold lowercase text-white">or use email</span>
              <div className="flex-1 h-[2px]" style={{ backgroundColor: "hsl(var(--border-mid))" }} />
            </div>

            <input
              type="email" placeholder="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="w-full h-12 px-4 text-base font-extrabold lowercase text-white placeholder:text-white/30 outline-none transition-colors duration-150 focus:border-neon-yellow"
              style={{ borderRadius: 10, border: "2px solid hsl(var(--border-mid))", backgroundColor: "hsl(var(--card))" }}
              disabled={emailLoading || googleLoading}
            />
            <input
              type="password" placeholder="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => { if (e.key === "Enter") handleEmailAuth(); }}
              className="w-full h-12 px-4 text-base font-extrabold lowercase text-white placeholder:text-white/30 outline-none transition-colors duration-150 focus:border-neon-yellow"
              style={{ borderRadius: 10, border: "2px solid hsl(var(--border-mid))", backgroundColor: "hsl(var(--card))" }}
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
              className="w-full text-center text-[11px] font-extrabold lowercase text-white hover:opacity-80 transition-colors duration-150"
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
            className="mt-3 w-full text-center text-[11px] font-extrabold lowercase text-white hover:opacity-80 transition-colors duration-150 disabled:opacity-50"
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
