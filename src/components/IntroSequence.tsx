import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const TOTAL = 5;
const YELLOW = "hsl(50 100% 50%)";
const AUTO_DELAY = 3200; // ms per slide before auto-advance

/* ── progress dots ── */
const Dots = ({ current }: { current: number }) => (
  <div className="flex items-center justify-center gap-2.5">
    {Array.from({ length: TOTAL }).map((_, i) => (
      <div
        key={i}
        className="rounded-full"
        style={{
          width: i === current ? 10 : 7,
          height: i === current ? 10 : 7,
          background: i === current ? YELLOW : "hsl(0 0% 100% / 0.25)",
          transition: "all 0.2s",
        }}
      />
    ))}
  </div>
);

/* ── big white confirm button ── */
const ConfirmButton = ({ onClick, label = "next" }: { onClick: (e: React.MouseEvent) => void; label?: string }) => (
  <motion.button
    onClick={onClick}
    className="mt-4 h-16 w-full max-w-[16rem] rounded-2xl border-[4px] border-white bg-white text-lg font-[900] lowercase tracking-tight text-black active:scale-[0.95]"
    style={{ transition: "transform 0.05s" }}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.35, duration: 0.25 }}
  >
    {label}
  </motion.button>
);

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
const Screen1 = ({ onNext }: { onNext: (e: React.MouseEvent) => void }) => (
  <div className="flex flex-col items-center gap-5">
    <EmojiPop emoji="🎨" />
    <Title>create your character</Title>
    <motion.div
      className="grid grid-cols-2 gap-2"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25 }}
    >
      {["style", "hair", "eyes", "body"].map((l) => (
        <div key={l} className="flex h-11 w-[7rem] items-center justify-center rounded-xl bg-[hsl(0,0%,15%)]">
          <span className="text-[11px] font-extrabold lowercase text-white/40">{l}</span>
        </div>
      ))}
    </motion.div>
    <Sub>pick a style, hair, eyes, body type</Sub>
    <ConfirmButton onClick={onNext} />
  </div>
);

/* ── screen 2 ── */
const Screen2 = ({ onNext }: { onNext: (e: React.MouseEvent) => void }) => (
  <div className="flex flex-col items-center gap-5">
    <EmojiPop emoji="🤳" />
    <Title>choose your face</Title>
    <motion.div
      className="grid grid-cols-3 gap-2.5"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25 }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <MiniBox key={i} className="h-14 w-14" />
      ))}
    </motion.div>
    <Sub>we generate 6 faces from your choices. pick your favourite</Sub>
    <ConfirmButton onClick={onNext} />
  </div>
);

/* ── screen 3 ── */
const Screen3 = ({ onNext }: { onNext: (e: React.MouseEvent) => void }) => (
  <div className="flex flex-col items-center gap-5">
    <EmojiPop emoji="📸" />
    <Title>create photos</Title>
    <motion.div
      className="flex flex-col gap-2 w-full max-w-[15rem]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25 }}
    >
      <div className="flex h-11 items-center rounded-xl px-3 bg-[hsl(0,0%,15%)]">
        <span className="text-[11px] font-extrabold lowercase text-white/30">describe your scene...</span>
      </div>
      <MiniBox className="w-full h-24" />
    </motion.div>
    <Sub>write a scene. your character gets placed in it. costs 1 gem per photo</Sub>
    <ConfirmButton onClick={onNext} />
  </div>
);

/* ── screen 4 ── */
const Screen4 = ({ onNext }: { onNext: (e: React.MouseEvent) => void }) => (
  <div className="flex flex-col items-center gap-5">
    <EmojiPop emoji="💎" />
    <Title>save & collect</Title>
    <motion.div
      className="flex gap-3"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, duration: 0.25 }}
    >
      {["💾", "🛒", "✨"].map((e, i) => (
        <div key={i} className="flex h-14 w-14 items-center justify-center rounded-xl bg-[hsl(0,0%,15%)]">
          <span className="text-2xl">{e}</span>
        </div>
      ))}
    </motion.div>
    <Sub>photos save to your storage. get more gems with top-ups or subscribe for $7/month</Sub>
    <ConfirmButton onClick={onNext} />
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
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = back
  const touchStartX = useRef<number | null>(null);
  const animating = useRef(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) { setStep(0); setDirection(1); }
  }, [open]);

  // Lock scroll fully
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
    return () => {
      document.body.style.overflow = prev.body;
      document.documentElement.style.overflow = prev.html;
      if (root) root.style.overflow = prev.root;
    };
  }, [open]);

  const goTo = useCallback((next: number) => {
    if (animating.current) return;
    if (next < 0 || next >= TOTAL || next === step) return;
    animating.current = true;
    setDirection(next > step ? 1 : -1);
    setStep(next);
    setTimeout(() => { animating.current = false; }, 350);
  }, [step]);

  const advance = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    goTo(step + 1);
  }, [goTo, step]);

  const goBack = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    goTo(step - 1);
  }, [goTo, step]);

  // Swipe support
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50) goTo(step + 1);
    else if (diff < -50) goTo(step - 1);
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
          {/* skip */}
          <div className="flex items-center justify-between px-5 pt-5">
            {step > 0 ? (
              <button
                onClick={goBack}
                className="text-xs font-extrabold lowercase text-white/40 active:text-white/70"
              >
                ← back
              </button>
            ) : <div />}
            <button
              onClick={(e) => { e.stopPropagation(); onComplete(); }}
              className="text-xs font-extrabold lowercase text-white/40 active:text-white/70"
            >
              skip
            </button>
          </div>

          {/* content */}
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
                {step === 0 && <Screen1 onNext={advance} />}
                {step === 1 && <Screen2 onNext={advance} />}
                {step === 2 && <Screen3 onNext={advance} />}
                {step === 3 && <Screen4 onNext={advance} />}
                {step === 4 && <Screen5 onGo={onComplete} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* dots */}
          <div className="pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-4">
            <Dots current={step} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default IntroSequence;
