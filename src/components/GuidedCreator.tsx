import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Gem, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "@/components/ui/sonner";

/* ── Constants ── */
const NEON_BLUE = "hsl(195 100% 55%)";
const PURE_WHITE = "hsl(0 0% 100%)";
const AMBER = "hsl(var(--neon-yellow))";

const TRAITS = [
  { key: "skin", label: "pick her skin…", emoji: "🎨", options: ["pale", "tan", "asian", "dark"] },
  { key: "bodyType", label: "choose her body…", emoji: "💃", options: ["slim", "regular", "curvy"] },
  { key: "chest", label: "choose her chest…", emoji: "👙", options: ["small", "medium", "large"] },
  { key: "hairStyle", label: "pick her hair…", emoji: "💇", options: ["straight", "curly", "bangs", "short"] },
  { key: "hairColour", label: "pick her hair colour…", emoji: "🌈", options: ["blonde", "brunette", "black", "pink"] },
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
const Dots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="rounded-full transition-all duration-200"
        style={{
          width: i === current ? 10 : 8,
          height: i === current ? 10 : 8,
          background: i === current ? NEON_BLUE : PURE_WHITE,
        }}
      />
    ))}
  </div>
);

/* ── Nav arrow ── */
const NavArrow = ({ direction, onClick, disabled }: { direction: "left" | "right"; onClick: () => void; disabled?: boolean }) => (
  <button
    onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
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
);

/* ── Background glow ── */
const AmbientGlow = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <motion.div
      className="absolute rounded-full blur-[120px]"
      style={{
        width: "70%", height: "70%", top: "20%", left: "15%",
        background: "radial-gradient(circle, hsl(260 80% 30% / 0.15), hsl(220 90% 20% / 0.08), transparent 70%)",
      }}
      animate={{ x: [0, 40, -30, 0], y: [0, -30, 20, 0], scale: [1, 1.15, 0.9, 1] }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute rounded-full blur-[100px]"
      style={{
        width: "50%", height: "50%", bottom: "10%", right: "5%",
        background: "radial-gradient(circle, hsl(200 80% 25% / 0.12), hsl(240 70% 20% / 0.06), transparent 70%)",
      }}
      animate={{ x: [0, -35, 25, 0], y: [0, 20, -25, 0], scale: [1, 0.85, 1.1, 1] }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
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
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    animate={
      selected
        ? { scale: [1, 1.15, 1], transition: { duration: 0.3 } }
        : shaking
          ? { x: [0, -6, 6, -4, 4, 0], transition: { duration: 0.4 } }
          : {}
    }
    className={`rounded-xl px-4 py-2.5 text-sm font-[900] lowercase tracking-tight transition-colors ${
      selected
        ? "bg-neon-yellow text-neon-yellow-foreground border-[3px] border-neon-yellow"
        : "border-[3px] border-white/15 bg-white/5 text-white/70 hover:border-white/30"
    }`}
  >
    {label}
  </motion.button>
);

/* ── Types ── */
export interface GuidedSelections {
  skin: string; bodyType: string; chest: string; hairStyle: string;
  hairColour: string; eye: string; makeup: string;
  characterName: string; age: string;
}

const emptySelections: GuidedSelections = {
  skin: "", bodyType: "", chest: "", hairStyle: "",
  hairColour: "", eye: "", makeup: "",
  characterName: "", age: "",
};

interface GuidedCreatorProps {
  open: boolean;
  showWelcome: boolean;
  onComplete: (selections: GuidedSelections) => void;
  onExit: (partialSelections: Partial<GuidedSelections>) => void;
  onMarkWelcomeSeen: () => void;
}

const GuidedCreator = ({ open, showWelcome, onComplete, onExit, onMarkWelcomeSeen }: GuidedCreatorProps) => {
  const { user } = useAuth();
  const { credits: gems } = useCredits();

  const welcomeOffset = showWelcome ? 1 : 0;
  const TOTAL = 7 + welcomeOffset + 2; // traits + summary + create

  const [step, setStep] = useState(0);
  const [selections, setSelections] = useState<GuidedSelections>({ ...emptySelections });
  const [shaking, setShaking] = useState(false);
  const [summaryShake, setSummaryShake] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shattering, setShattering] = useState(false);
  const [visible, setVisible] = useState(false);
  const animating = useRef(false);
  const pendingActionRef = useRef<(() => void) | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setStep(0);
      setSelections({ ...emptySelections });
      setShaking(false);
      setSummaryShake(false);
      setShattering(false);
      setVisible(true);
      animating.current = false;
      pendingActionRef.current = null;
    }
  }, [open]);

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

  const getTraitIndex = (s: number) => {
    const adjusted = s - welcomeOffset;
    if (adjusted < 0 || adjusted >= 7) return -1;
    return adjusted;
  };

  const currentTraitIndex = getTraitIndex(step);
  const isSummarySlide = step === 7 + welcomeOffset;
  const isCreateSlide = step === 8 + welcomeOffset;
  const isWelcomeSlide = showWelcome && step === 0;

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

  const triggerExit = useCallback((afterAction?: () => void) => {
    if (shattering) return;
    pendingActionRef.current = afterAction || null;
    setShattering(true);
  }, [shattering]);

  const handleShatterDone = useCallback(() => {
    setVisible(false);
    setShattering(false);
    if (pendingActionRef.current) {
      pendingActionRef.current();
      pendingActionRef.current = null;
    }
  }, []);

  const selectionsRef = useRef(selections);
  selectionsRef.current = selections;

  const advance = useCallback(() => {
    if (animating.current) return;
    if (isWelcomeSlide) {
      onMarkWelcomeSeen();
    }
    if (currentTraitIndex >= 0 && !isCurrentSelected()) {
      triggerShake();
      return;
    }
    if (isSummarySlide) {
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
      triggerExit(() => onComplete(selectionsRef.current));
      return;
    }
    animating.current = true;
    setStep((s) => Math.min(s + 1, TOTAL - 1));
    setTimeout(() => { animating.current = false; }, 100);
  }, [step, TOTAL, currentTraitIndex, isWelcomeSlide, isSummarySlide, isCreateSlide, shattering, onComplete, onMarkWelcomeSeen, triggerExit]);

  const goBack = useCallback(() => {
    if (animating.current || step <= 0) return;
    animating.current = true;
    setStep((s) => s - 1);
    setTimeout(() => { animating.current = false; }, 100);
  }, [step]);

  const handleSkipToQuick = () => {
    const s = selectionsRef.current;
    const partial: Partial<GuidedSelections> = {};
    for (const trait of TRAITS) {
      if (s[trait.key]) partial[trait.key] = s[trait.key];
    }
    if (s.characterName) partial.characterName = s.characterName;
    if (s.age) partial.age = s.age;
    triggerExit(() => onExit(partial));
  };

  const canAdvance = isWelcomeSlide || isCurrentSelected() || isSummarySlide || isCreateSlide;

  if (!mounted || !visible) return null;

  const renderSlide = () => {
    if (isWelcomeSlide) {
      return (
        <div className="flex w-full flex-col items-center">
          <div className="flex h-14 items-end justify-center">
            <BigEmoji emoji="👁️" index={0} />
          </div>
          <h2 className="mt-2 text-center text-[2.2rem] font-[900] lowercase leading-tight tracking-tight text-white">
            let's create her…
          </h2>
          <p className="mt-3 text-sm font-extrabold lowercase text-white/40">tap to start</p>
        </div>
      );
    }

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

    if (isSummarySlide) {
      return (
        <div className="flex w-full flex-col items-center">
          <div className="flex h-14 items-end justify-center">
            <BigEmoji emoji="✨" index={7} />
          </div>
          <h2 className="mt-2 text-center text-[2.2rem] font-[900] lowercase leading-tight tracking-tight text-white">
            here's your character
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
          <motion.input
            animate={summaryShake && !selections.characterName.trim() ? { x: [0, -6, 6, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
            value={selections.characterName}
            onChange={(e) => setSelections((p) => ({ ...p, characterName: e.target.value }))}
            placeholder="character name..."
            onClick={(e) => e.stopPropagation()}
            className="mt-5 h-12 w-full max-w-[16rem] rounded-2xl border-[5px] border-white/15 bg-white/5 px-4 text-sm font-[900] lowercase text-white placeholder:text-white/30 outline-none focus:border-white/40 transition-colors"
          />
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
            className="mt-3 h-12 w-full max-w-[16rem] rounded-2xl border-[5px] border-white/15 bg-white/5 px-4 text-sm font-[900] lowercase text-white placeholder:text-white/30 outline-none focus:border-white/40 transition-colors"
          />
        </div>
      );
    }

    if (isCreateSlide) {
      const isFirstFree = !user;
      return (
        <div className="flex w-full flex-col items-center">
          <div className="flex h-14 items-end justify-center">
            <BigEmoji emoji="🚀" index={0} />
          </div>
          <h2 className="mt-2 text-center text-[2.2rem] font-[900] lowercase leading-tight tracking-tight text-white">
            {isFirstFree ? "your first character\nis free" : "ready to create?"}
          </h2>
          {!isFirstFree && (
            <div className="mt-3 flex items-center gap-2">
              <Gem size={16} strokeWidth={2.5} className="text-gem-green" />
              <span className="text-sm font-[900] lowercase text-white/60">{gems} gems</span>
            </div>
          )}
        </div>
      );
    }

    return null;
  };

  return createPortal(
    <AnimatePresence onExitComplete={handleShatterDone}>
      {!shattering && (
        <motion.div
          className="fixed inset-0 z-[9998] flex flex-col bg-black"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.65, ease: [0, 0, 0.2, 1] }}
          onClick={advance}
        >
          <AmbientGlow />

          <div className="relative flex-1 overflow-hidden">
            <div className="absolute inset-x-0 flex items-center justify-center px-8" style={{ top: "42%", transform: "translateY(-50%)" }}>
              <div className="w-full max-w-xs mx-auto flex flex-col items-center">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    className="w-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.05, ease: "linear" }}
                  >
                    {renderSlide()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: "72%" }}>
              {isCreateSlide ? (
                <button
                  onClick={(e) => { e.stopPropagation(); advance(); }}
                  className="h-14 w-[80vw] max-w-[20rem] rounded-2xl text-base font-[900] lowercase tracking-tight active:scale-[0.95] flex items-center justify-center gap-2"
                  style={{ background: AMBER, color: "#000", transition: "transform 0.05s" }}
                >
                  <Zap size={18} strokeWidth={2.5} />
                  {!user ? "create · free" : "create · 30 gems"}
                </button>
              ) : (
                <>
                  <div className="mb-4 flex h-14 items-center gap-4">
                    <NavArrow direction="left" onClick={goBack} disabled={step === 0} />
                    <NavArrow
                      direction="right"
                      onClick={advance}
                      disabled={!canAdvance && currentTraitIndex >= 0}
                    />
                  </div>
                  <div className="flex h-3 items-center">
                    <Dots current={step} total={TOTAL} />
                  </div>
                </>
              )}

              {!isCreateSlide && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleSkipToQuick(); }}
                  className="mt-5 text-xs font-extrabold lowercase text-white/30 hover:text-white/50 transition-colors"
                >
                  skip to quick mode
                </button>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

/* ── Sign-in overlay (post face selection) ── */
export const SignInOverlay = ({ open, onSignedIn }: { open: boolean; onSignedIn: () => void }) => {
  const { user } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open && !user) setVisible(true);
    if (user && visible) {
      // User just signed in — fire callback
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
        redirect_uri: window.location.origin + "/choose-face",
      });
      if (result?.error) { toast.error("google sign in failed"); setGoogleLoading(false); }
    } catch (err: any) {
      toast.error(err.message || "sign in failed");
      setGoogleLoading(false);
    }
  };

  if (!visible) return null;

  return createPortal(
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
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
          disabled={googleLoading}
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
          onClick={() => {
            // Navigate to account page for email sign-in, preserving session data
            window.location.href = "/account?redirect=" + encodeURIComponent("/choose-face");
          }}
          className="mt-4 w-full h-14 rounded-2xl border-[5px] border-white/15 bg-white/5 text-sm font-[900] lowercase text-white flex items-center justify-center gap-2 hover:border-white/30 transition-colors"
        >
          sign in with email
        </button>
      </div>
    </motion.div>,
    document.body,
  );
};

export default GuidedCreator;
