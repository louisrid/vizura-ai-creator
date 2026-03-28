import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const TOTAL = 7;

/* ── colour themes per screen ── */
const themes = [
  { bg: "hsl(330 100% 60%)", emojis: ["💅", "🔥", "✨"], label: "style", options: ["natural", "model", "egirl"] },
  { bg: "hsl(270 100% 60%)", emojis: ["💇‍♀️", "💜"], label: "hair colour", options: ["blonde", "brunette", "black", "red", "pink", "white"] },
  { bg: "hsl(210 100% 55%)", emojis: ["👁️", "💎"], label: "eye colour", options: ["brown", "blue", "green", "hazel", "grey"] },
  { bg: "hsl(145 80% 45%)", emojis: ["💚", "🫧"], label: "body type", options: ["slim", "regular", "curvy"] },
  { bg: "hsl(25 100% 55%)", emojis: ["🌍", "🧡"], label: "ethnicity", options: ["american", "british", "brazilian", "french", "japanese", "korean", "scandinavian"] },
  { bg: "hsl(50 100% 50%)", emojis: ["⚡", "💛"], label: "age", options: ["18", "20", "22", "25", "28", "30", "35", "40"] },
] as const;

/* ── spinning emoji ── */
const SpinEmoji = ({ emoji, delay, x, y }: { emoji: string; delay: number; x: number; y: number }) => (
  <motion.span
    className="absolute text-4xl select-none pointer-events-none"
    style={{ left: `${x}%`, top: `${y}%` }}
    initial={{ opacity: 0, scale: 0, rotate: 0 }}
    animate={{ opacity: [0, 1, 1, 0.6], scale: [0, 1.2, 1, 1], rotate: [0, 360] }}
    transition={{ delay, duration: 2, repeat: Infinity, ease: "easeInOut" }}
  >
    {emoji}
  </motion.span>
);

/* ── option pill ── */
const OptionPill = ({ label, index, variant }: { label: string; index: number; variant: string }) => {
  const animations: Record<string, object> = {
    bounce: { opacity: [0, 1], y: [30, 0], scale: [0.7, 1] },
    slide: { opacity: [0, 1], x: [-40, 0] },
    fade: { opacity: [0, 1], scale: [0.8, 1] },
    pop: { opacity: [0, 1], scale: [0, 1.1, 1] },
    float: { opacity: [0, 1], y: [20, -5, 0] },
    drop: { opacity: [0, 1], y: [-30, 5, 0] },
  };

  return (
    <motion.div
      className="flex h-11 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm px-5"
      initial={{ opacity: 0 }}
      animate={animations[variant] || animations.bounce}
      transition={{
        delay: 0.3 + index * 0.08,
        duration: 0.5,
        type: "spring",
        stiffness: 300,
        damping: 20,
      }}
    >
      <span className="text-sm font-[900] lowercase tracking-tight text-white">{label}</span>
    </motion.div>
  );
};

/* ── progress dots ── */
const Dots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <motion.div
        key={i}
        className="rounded-full"
        style={{
          width: i === current ? 24 : 8,
          height: 8,
          background: i === current ? "white" : "rgba(255,255,255,0.3)",
        }}
        layout
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
      />
    ))}
  </div>
);

/* ── option screen (screens 1-6) ── */
const OptionScreen = ({ step }: { step: number }) => {
  const theme = themes[step];
  const variants = ["bounce", "slide", "fade", "pop", "float", "drop"];
  const variant = variants[step] || "bounce";

  // Emoji positions scattered around
  const emojiPositions = [
    { x: 10, y: 8 }, { x: 75, y: 5 }, { x: 85, y: 55 },
    { x: 5, y: 60 }, { x: 50, y: 3 }, { x: 65, y: 65 },
  ];

  return (
    <div className="relative flex flex-col items-center w-full h-full overflow-hidden">
      {/* Neon background burst */}
      <motion.div
        className="absolute inset-0"
        style={{ background: `radial-gradient(ellipse at center, ${theme.bg}, transparent 70%)`, opacity: 0.35 }}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [0.5, 1.4, 1.2], opacity: [0, 0.5, 0.35] }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />

      {/* Spinning emojis */}
      {theme.emojis.map((emoji, i) =>
        emojiPositions.slice(0, theme.emojis.length + 2).map((pos, j) => (
          <SpinEmoji
            key={`${i}-${j}`}
            emoji={emoji}
            delay={0.1 + (i + j) * 0.2}
            x={pos.x + i * 8}
            y={pos.y + i * 12}
          />
        ))
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 pt-[22vh]">
        <motion.h2
          className="text-[2.5rem] font-[900] lowercase leading-tight tracking-tight text-white text-center"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.5, type: "spring", stiffness: 200, damping: 18 }}
        >
          {theme.label}
        </motion.h2>

        <div className="flex flex-wrap justify-center gap-2.5 max-w-[20rem]">
          {theme.options.map((opt, i) => (
            <OptionPill key={opt} label={opt} index={i} variant={variant} />
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── screen 7: ready ── */
const ReadyScreen = ({ onGo }: { onGo: () => void }) => {
  // All theme colours for the swirl
  const colors = themes.map((t) => t.bg);

  return (
    <div className="relative flex flex-col items-center w-full h-full overflow-hidden">
      {/* Multi-colour swirl */}
      {colors.map((color, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 300,
            height: 300,
            background: `radial-gradient(circle, ${color}, transparent 70%)`,
            left: `${20 + (i % 3) * 25}%`,
            top: `${15 + Math.floor(i / 3) * 30}%`,
            opacity: 0.3,
          }}
          animate={{
            x: [0, 30 * Math.cos(i * 1.2), -20 * Math.sin(i), 0],
            y: [0, -25 * Math.sin(i * 0.8), 30 * Math.cos(i), 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{ duration: 4 + i * 0.5, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      {/* Scattered emojis from all themes */}
      {themes.flatMap((t) => t.emojis).slice(0, 8).map((emoji, i) => (
        <SpinEmoji
          key={i}
          emoji={emoji}
          delay={i * 0.15}
          x={10 + (i * 11) % 80}
          y={10 + (i * 13) % 60}
        />
      ))}

      <div className="relative z-10 flex flex-col items-center gap-10 pt-[25vh]">
        <motion.h2
          className="text-[3rem] font-[900] lowercase leading-tight tracking-tight text-white text-center"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1, duration: 0.6, type: "spring", stiffness: 180, damping: 16 }}
        >
          ready?
        </motion.h2>

        <motion.button
          onClick={(e) => {
            e.stopPropagation();
            onGo();
          }}
          className="h-16 w-full max-w-[16rem] rounded-full text-lg font-[900] lowercase tracking-tight active:scale-[0.95]"
          style={{
            background: "hsl(42 100% 50%)",
            color: "#000",
            transition: "transform 0.05s",
          }}
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5, type: "spring", stiffness: 200, damping: 18 }}
          whileTap={{ scale: 0.93 }}
        >
          let's go
        </motion.button>
      </div>
    </div>
  );
};

/* ═══════════════════ MAIN ═══════════════════ */

interface IntroSequenceProps {
  open: boolean;
  onComplete: () => void;
}

const IntroSequence = ({ open, onComplete }: IntroSequenceProps) => {
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [direction, setDirection] = useState(1);
  const animating = useRef(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) {
      setStep(0);
      setDirection(1);
      animating.current = false;
    }
  }, [open]);

  const goTo = useCallback((next: number) => {
    if (animating.current) return;
    if (next < 0 || next >= TOTAL || next === step) return;
    animating.current = true;
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setTimeout(() => { animating.current = false; }, 400);
  }, [step]);

  const advance = useCallback(() => goTo(step + 1), [goTo, step]);

  // Lock scroll
  useEffect(() => {
    if (!open) return;
    const root = document.getElementById("root");
    const prev = {
      body: document.body.style.overflow,
      html: document.documentElement.style.overflow,
      root: root?.style.overflow ?? "",
    };
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (root) root.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = prev.body;
      document.documentElement.style.overflow = prev.html;
      if (root) root.style.overflow = prev.root;
      document.body.style.touchAction = "";
    };
  }, [open]);

  // Tap anywhere to advance (except on the "let's go" button)
  const handleTap = useCallback(() => {
    if (step < TOTAL - 1) advance();
  }, [step, advance]);

  if (!mounted) return null;

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * 60, scale: 0.95 }),
    center: { opacity: 1, x: 0, scale: 1 },
    exit: (d: number) => ({ opacity: 0, x: d * -60, scale: 0.95 }),
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col bg-black cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={handleTap}
        >
          {/* Screen content */}
          <div className="flex-1 relative">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
                className="absolute inset-0"
              >
                {step < 6 && <OptionScreen step={step} />}
                {step === 6 && <ReadyScreen onGo={onComplete} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Bottom area: tap hint + dots */}
          <div className="flex flex-col items-center gap-4 pb-[max(env(safe-area-inset-bottom),2rem)] pt-2">
            {step < TOTAL - 1 && (
              <p className="text-xs font-bold lowercase text-white/30">tap to continue</p>
            )}
            <Dots current={step} total={TOTAL} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default IntroSequence;
