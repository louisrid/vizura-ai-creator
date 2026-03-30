import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, Gem } from "lucide-react";
import { IntroDots, IntroNavArrow } from "./overlay/IntroSequencePrimitives";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/contexts/CreditsContext";

/* ── Trait definitions ── */
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
const InteractivePill = ({
  label, selected, shaking, onClick,
}: {
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

/* ── Slide types ── */
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
    }
  }, [open]);

  // Lock scroll
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

  // Which trait index is this step? (-1 if not a trait slide)
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
    if (!key) return true; // non-trait slides
    return !!selections[key];
  };

  const setTrait = (key: TraitKey, value: string) => {
    setSelections((prev) => ({ ...prev, [key]: value }));
  };

  const triggerShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const triggerExit = useCallback(() => {
    if (shattering) return;
    setShattering(true);
  }, [shattering]);

  const handleShatterDone = useCallback(() => {
    setVisible(false);
    setShattering(false);
  }, []);

  const advance = useCallback(() => {
    if (animating.current) return;
    // Welcome slide — mark as seen
    if (isWelcomeSlide) {
      onMarkWelcomeSeen();
    }
    // Trait slides — must select before advancing
    if (currentTraitIndex >= 0 && !isCurrentSelected()) {
      triggerShake();
      return;
    }
    // Summary slide — validate name and age
    if (isSummarySlide) {
      const missingName = !selections.characterName.trim();
      const ageNum = Number(selections.age);
      const invalidAge = !selections.age || ageNum < 18 || ageNum > 40;
      if (missingName || invalidAge) {
        setSummaryShake(true);
        setTimeout(() => setSummaryShake(false), 500);
        return;
      }
    }
    // Create slide — trigger completion
    if (isCreateSlide) {
      triggerExit();
      setTimeout(() => onComplete(selections), 700);
      return;
    }
    animating.current = true;
    setStep((s) => Math.min(s + 1, TOTAL - 1));
    setTimeout(() => { animating.current = false; }, 100);
  }, [step, TOTAL, currentTraitIndex, isWelcomeSlide, isSummarySlide, isCreateSlide, selections, shattering, onComplete, onMarkWelcomeSeen, triggerExit]);

  const goBack = useCallback(() => {
    if (animating.current || step <= 0) return;
    animating.current = true;
    setStep((s) => s - 1);
    setTimeout(() => { animating.current = false; }, 100);
  }, [step]);

  const handleSkipToQuick = () => {
    // Collect partial selections
    const partial: Partial<GuidedSelections> = {};
    for (const trait of TRAITS) {
      if (selections[trait.key]) partial[trait.key] = selections[trait.key];
    }
    if (selections.characterName) partial.characterName = selections.characterName;
    if (selections.age) partial.age = selections.age;
    triggerExit();
    setTimeout(() => onExit(partial), 700);
  };

  const canAdvance = isWelcomeSlide || isCurrentSelected() || isSummarySlide || isCreateSlide;

  if (!mounted || !visible) return null;

  const renderSlide = () => {
    // Welcome slide
    if (isWelcomeSlide) {
      return (
        <div className="flex w-full flex-col items-center">
          <div className="flex h-14 items-end justify-center">
            <BigEmoji emoji="👁️" index={0} />
          </div>
          <h2 className="mt-2 text-center text-[2.2rem] font-[900] lowercase leading-tight tracking-tight text-white">
            welcome to<br />vizura
          </h2>
          <p className="mt-3 text-sm font-extrabold lowercase text-white/40">tap to start</p>
        </div>
      );
    }

    // Trait slides
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

    // Summary slide
    if (isSummarySlide) {
      return (
        <div className="flex w-full flex-col items-center">
          <div className="flex h-14 items-end justify-center">
            <BigEmoji emoji="✨" index={7} />
          </div>
          <h2 className="mt-2 text-center text-[2.2rem] font-[900] lowercase leading-tight tracking-tight text-white">
            here's your character
          </h2>
          {/* Selected traits as amber pills */}
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
          <motion.input
            animate={summaryShake && !selections.characterName.trim() ? { x: [0, -6, 6, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
            value={selections.characterName}
            onChange={(e) => setSelections((p) => ({ ...p, characterName: e.target.value }))}
            placeholder="character name..."
            onClick={(e) => e.stopPropagation()}
            className="mt-5 h-12 w-full max-w-[16rem] rounded-2xl border-[5px] border-white/15 bg-white/5 px-4 text-sm font-[900] lowercase text-white placeholder:text-white/30 outline-none focus:border-white/40 transition-colors"
          />
          {/* Age input */}
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

    // Create slide
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
          className="fixed inset-0 z-[9999] flex flex-col bg-black"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.65, ease: [0, 0, 0.2, 1] }}
          onClick={advance}
        >
          <AmbientGlow />

          <div className="relative flex-1 overflow-hidden">
            {/* Content area */}
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

            {/* Navigation area */}
            <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: "72%" }}>
              {isCreateSlide ? (
                <button
                  onClick={(e) => { e.stopPropagation(); advance(); }}
                  className="h-14 w-[80vw] max-w-[20rem] rounded-2xl text-base font-[900] lowercase tracking-tight active:scale-[0.95] flex items-center justify-center gap-2"
                  style={{ background: "hsl(var(--neon-yellow))", color: "#000", transition: "transform 0.05s" }}
                >
                  <Zap size={18} strokeWidth={2.5} />
                  {!user ? "create · free" : "create · 30 gems"}
                </button>
              ) : (
                <>
                  <div className="mb-4 flex h-14 items-center gap-4">
                    <IntroNavArrow direction="left" onClick={(e?: any) => { goBack(); }} disabled={step === 0} />
                    <IntroNavArrow
                      direction="right"
                      onClick={() => advance()}
                      disabled={!canAdvance && currentTraitIndex >= 0}
                    />
                  </div>
                  <div className="flex h-3 items-center">
                    <IntroDots current={step} total={TOTAL} />
                  </div>
                </>
              )}

              {/* Skip to quick mode link */}
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

export default GuidedCreator;
