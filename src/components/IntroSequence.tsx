import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ProgressDots, ArrowButton, LIGHT_BLUE } from "@/components/overlay/OverlayPrimitives";

const TOTAL = 5;
const YELLOW = "hsl(50 100% 50%)";
const AUTO_DELAY = 3200;


/* ── mini dark grey box ── */
const MiniBox = ({ className = "" }: { className?: string }) => (
  <div className={`rounded-xl bg-[hsl(0,0%,15%)] ${className}`} />
);

/* ── emoji pop ── */
const EmojiPop = ({ emoji }: { emoji: string }) => (
  <motion.span
    className="text-6xl block"
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ delay: 0.05, duration: 0.3, type: "spring", stiffness: 300, damping: 20 }}
  >
    {emoji}
  </motion.span>
);

/* ── screen title ── */
const Title = ({ children }: { children: React.ReactNode }) => (
  <motion.h2
    className="text-[1.8rem] font-[900] lowercase leading-tight tracking-tight text-white text-center"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.1, duration: 0.25 }}
  >
    {children}
  </motion.h2>
);

/* ── screen subtitle ── */
const Sub = ({ children }: { children: React.ReactNode }) => (
  <motion.p
    className="text-sm font-bold lowercase text-white/60 text-center max-w-[17rem] leading-relaxed"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay: 0.25, duration: 0.25 }}
  >
    {children}
  </motion.p>
);

/* ── screen 1 ── */
const Screen1 = () => (
  <div className="flex flex-col items-center gap-6">
    <EmojiPop emoji="🎨" />
    <Title>create your character</Title>
    <motion.div
      className="grid grid-cols-2 gap-2.5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25 }}
    >
      {["style", "hair", "eyes", "body"].map((l) => (
        <div key={l} className="flex h-12 w-[7.5rem] items-center justify-center rounded-xl bg-[hsl(0,0%,15%)]">
          <span className="text-xs font-extrabold lowercase text-white/40">{l}</span>
        </div>
      ))}
    </motion.div>
    <Sub>pick a style, hair, eyes, body type</Sub>
  </div>
);

/* ── screen 2 ── */
const Screen2 = () => (
  <div className="flex flex-col items-center gap-6">
    <EmojiPop emoji="🤳" />
    <Title>choose your face</Title>
    <motion.div
      className="grid grid-cols-3 gap-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25 }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <MiniBox key={i} className="h-16 w-16" />
      ))}
    </motion.div>
    <Sub>we generate 6 faces from your choices. pick your favourite</Sub>
  </div>
);

/* ── screen 3 ── */
const Screen3 = () => (
  <div className="flex flex-col items-center gap-6">
    <EmojiPop emoji="📸" />
    <Title>create photos</Title>
    <motion.div
      className="flex flex-col gap-2.5 w-full max-w-[16rem]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25 }}
    >
      <div className="flex h-12 items-center rounded-xl px-3 bg-[hsl(0,0%,15%)]">
        <span className="text-xs font-extrabold lowercase text-white/30">describe your scene...</span>
      </div>
      <MiniBox className="w-full h-28" />
    </motion.div>
    <Sub>write a scene. your character gets placed in it. costs 1 gem per photo</Sub>
  </div>
);

/* ── screen 4 ── */
const Screen4 = () => (
  <div className="flex flex-col items-center gap-6">
    <EmojiPop emoji="💎" />
    <Title>save & collect</Title>
    <motion.div
      className="flex gap-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25 }}
    >
      {["💾", "🛒", "✨"].map((e, i) => (
        <div key={i} className="flex h-16 w-16 items-center justify-center rounded-xl bg-[hsl(0,0%,15%)]">
          <span className="text-2xl">{e}</span>
        </div>
      ))}
    </motion.div>
    <Sub>photos save to your storage. get more gems with top-ups or subscribe for $7/month</Sub>
  </div>
);

/* ── screen 5 ── */
const Screen5 = ({ onGo }: { onGo: () => void }) => (
  <div className="flex flex-col items-center gap-6">
    <EmojiPop emoji="🚀" />
    <Title>ready?</Title>
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onGo();
      }}
      className="h-16 w-full max-w-[16rem] rounded-2xl border-[4px] text-lg font-[900] lowercase tracking-tight active:scale-[0.95]"
      style={{
        background: YELLOW,
        borderColor: YELLOW,
        color: "#000",
        transition: "transform 0.05s",
      }}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.3, duration: 0.3, type: "spring", stiffness: 200, damping: 20 }}
    >
      let's go
    </motion.button>
  </div>
);

/* ═══════════════════ MAIN ═══════════════════ */

interface IntroSequenceProps {
  open: boolean;
  onComplete: () => void;
}

const IntroSequence = ({ open, onComplete }: IntroSequenceProps) => {
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef<number | null>(null);
  const animating = useRef(false);
  const holdTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) { setStep(0); setDirection(1); animating.current = false; }
  }, [open]);

  const goTo = useCallback((next: number) => {
    if (animating.current) return;
    if (next < 0 || next >= TOTAL || next === step) return;
    animating.current = true;
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setTimeout(() => { animating.current = false; }, 350);
  }, [step]);

  // Auto-advance
  useEffect(() => {
    if (!open || step >= TOTAL - 1) return;
    const timer = setTimeout(() => goTo(step + 1), AUTO_DELAY);
    return () => clearTimeout(timer);
  }, [open, step, goTo]);

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

  const advance = useCallback(() => goTo(step + 1), [goTo, step]);
  const goBack = useCallback(() => goTo(step - 1), [goTo, step]);

  const clearHold = useCallback(() => {
    if (holdTimer.current) { clearInterval(holdTimer.current); holdTimer.current = null; }
  }, []);

  const startHold = useCallback((dir: "left" | "right") => {
    clearHold();
    holdTimer.current = setInterval(() => {
      if (dir === "right") goTo(step + 1);
      else goTo(step - 1);
    }, 400);
  }, [goTo, step, clearHold]);

  // Swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) advance(); else goBack();
    }
    touchStartX.current = null;
  };

  if (!mounted) return null;

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: d * 40 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d * -40 }),
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* content — centered in full screen */}
          <div className="flex-1 flex items-center justify-center px-6">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={step}
                custom={direction}
                variants={variants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                className="w-full max-w-sm flex flex-col items-center"
              >
                {step === 0 && <Screen1 />}
                {step === 1 && <Screen2 />}
                {step === 2 && <Screen3 />}
                {step === 3 && <Screen4 />}
                {step === 4 && <Screen5 onGo={onComplete} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* dots + arrows — generous bottom spacing */}
          <div className="flex flex-col items-center gap-6 pb-[max(env(safe-area-inset-bottom),2.5rem)] pt-2">
            <p className="text-xs font-bold lowercase text-white/30">swipe or hold arrow</p>
            <ProgressDots current={step} total={TOTAL} />
            <div className="flex items-center gap-6">
              <ArrowButton
                direction="left"
                onClick={goBack}
                disabled={step === 0}
                onPointerDown={() => startHold("left")}
                onPointerUp={clearHold}
                onPointerLeave={clearHold}
              />
              <ArrowButton
                direction="right"
                onClick={() => { if (step < TOTAL - 1) advance(); else onComplete(); }}
                onPointerDown={() => startHold("right")}
                onPointerUp={clearHold}
                onPointerLeave={clearHold}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default IntroSequence;
