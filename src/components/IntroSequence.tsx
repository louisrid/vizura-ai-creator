import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

const TOTAL = 6;
const LIGHT_BLUE = "hsl(195 100% 70%)";

/* ── per-screen emojis ── */
const screenEmojis: string[][] = [
  ["🖌️"],
  ["✨"],
  ["🫧"],
  ["🇺🇸"],
  ["🎀"],
  ["🚀", "🎉"],
];

/* ── per-screen micro-animation configs ── */
const emojiMotions = [
  { y: [0, -10, 0], rotate: [0, 6, -4, 0], scale: [1, 1.08, 1], duration: 2.8 },
  { y: [0, -7, 2, 0], rotate: [0, -8, 5, 0], scale: [1, 1.05, 0.97, 1], duration: 3.2 },
  { y: [0, -12, 0], rotate: [0, 10, -6, 0], scale: [1, 1.1, 0.95, 1], duration: 2.5 },
  { y: [0, -6, 4, 0], rotate: [0, -5, 8, -3, 0], scale: [1, 1.06, 1], duration: 3.5 },
  { y: [0, -14, 0], rotate: [0, 12, -8, 0], scale: [1, 1.12, 0.96, 1], duration: 2.6 },
  { y: [0, -9, 0], rotate: [0, 7, -5, 0], scale: [1, 1.07, 1], duration: 3.0 },
];

/* ── single emoji, full opacity, bouncy pop-in + idle loop ── */
const BigEmoji = ({ emoji, delay = 0, screenIndex = 0 }: { emoji: string; delay?: number; screenIndex?: number }) => {
  const motion_cfg = emojiMotions[screenIndex % emojiMotions.length];
  return (
    <motion.span
      className="select-none pointer-events-none text-[4.5rem]"
      initial={{ opacity: 0, scale: 0 }}
      animate={{ opacity: 1, scale: [0, 1.4, 0.9, 1] }}
      transition={{ delay, duration: 0.5, ease: [0.2, 0.9, 0.2, 1] }}
    >
      <motion.span
        className="inline-block"
        animate={{ y: motion_cfg.y, rotate: motion_cfg.rotate, scale: motion_cfg.scale }}
        transition={{ duration: motion_cfg.duration, repeat: Infinity, ease: "easeInOut", delay: delay + 0.5 }}
      >
        {emoji}
      </motion.span>
    </motion.span>
  );
};

/* ── emoji row ── */
const EmojiRow = ({ screenIndex }: { screenIndex: number }) => {
  const emojis = screenEmojis[screenIndex] || ["✨"];
  return (
    <div className="flex items-center justify-center gap-4">
      {emojis.map((e, i) => (
        <BigEmoji key={e} emoji={e} delay={0.05 + i * 0.15} screenIndex={screenIndex} />
      ))}
    </div>
  );
};

/* ── mock pill ── */
const Pill = ({ label, delay = 0 }: { label: string; delay?: number }) => (
  <motion.div
    className="flex h-7 items-center justify-center rounded-full px-3"
    style={{ background: "hsl(0 0% 100% / 0.08)" }}
    initial={{ opacity: 0, y: 6, scale: 0.92 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
  >
    <span className="text-[0.65rem] font-[800] lowercase tracking-tight text-white">{label}</span>
  </motion.div>
);

/* ── mock input ── */
const MockInput = ({ label, tall, delay = 0 }: { label: string; tall?: boolean; delay?: number }) => (
  <motion.div
    className="flex w-full flex-col gap-1"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
  >
    <span className="text-[0.55rem] font-bold lowercase text-white">{label}</span>
    <div
      className="w-full rounded-lg"
      style={{ background: "hsl(0 0% 100% / 0.08)", height: tall ? 30 : 20 }}
    />
  </motion.div>
);

/* ── section label ── */
const SectionLabel = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.p
    className="text-[0.5rem] font-bold uppercase tracking-widest text-white"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay, duration: 0.3 }}
  >
    {children}
  </motion.p>
);

/* ── progress dots ── */
const Dots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="rounded-full transition-all duration-200"
        style={{
          width: i === current ? 10 : 8,
          height: i === current ? 10 : 8,
          background: i === current ? LIGHT_BLUE : "hsl(0 0% 100% / 0.2)",
        }}
      />
    ))}
  </div>
);

/* ── arrow button ── */
const NavArrow = ({ direction, onClick, disabled }: { direction: "left" | "right"; onClick: () => void; disabled?: boolean }) => (
  <button
    onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
    className="flex h-14 w-14 items-center justify-center active:scale-[1.05]"
    style={{
      backgroundColor: direction === "right" ? LIGHT_BLUE : "transparent",
      border: direction === "right" ? `5px solid ${LIGHT_BLUE}` : "none",
      boxShadow: direction === "left" ? "inset 0 0 0 5px hsl(0 0% 100%)" : "none",
      opacity: direction === "right" && disabled ? 0.3 : 1,
      borderRadius: 16,
      outline: "none",
      WebkitAppearance: "none",
      appearance: "none",
      padding: 0,
      cursor: disabled && direction === "left" ? "default" : "pointer",
      transition: "transform 0.05s",
    }}
  >
    {direction === "left" ? (
      <ArrowLeft size={22} strokeWidth={2.75} color="hsl(0 0% 100%)" />
    ) : (
      <ArrowRight size={22} strokeWidth={2.5} style={{ color: "#000" }} />
    )}
  </button>
);

/* ═══════════ SCREENS ═══════════ */

const Screen1 = () => (
  <div className="relative flex flex-col items-center gap-3">
    <EmojiRow screenIndex={0} />
    <motion.h2
      className="text-[2.6rem] font-[900] lowercase leading-tight tracking-tight text-white text-center"
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      pick her style…
    </motion.h2>
    <div className="flex flex-wrap justify-center gap-1.5 pt-1">
      <Pill label="natural" delay={0.15} />
      <Pill label="model" delay={0.22} />
      <Pill label="egirl" delay={0.29} />
    </div>
  </div>
);

const Screen2 = () => (
  <div className="relative flex flex-col items-center gap-3">
    <EmojiRow screenIndex={1} />
    <motion.h2
      className="text-[2.6rem] font-[900] lowercase leading-tight tracking-tight text-white text-center"
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      set her look…
    </motion.h2>
    <div className="flex flex-col gap-1.5 w-full pt-1">
      <SectionLabel delay={0.15}>hair colour</SectionLabel>
      <div className="flex flex-wrap gap-1">
        {["blonde", "brunette", "black", "red", "pink", "white"].map((h, i) => (
          <Pill key={h} label={h} delay={0.18 + i * 0.05} />
        ))}
      </div>
      <SectionLabel delay={0.4}>eye colour</SectionLabel>
      <div className="flex flex-wrap gap-1">
        {["brown", "blue", "green", "hazel", "grey"].map((e, i) => (
          <Pill key={e} label={e} delay={0.43 + i * 0.05} />
        ))}
      </div>
    </div>
  </div>
);

const Screen3 = () => (
  <div className="relative flex flex-col items-center gap-3">
    <EmojiRow screenIndex={2} />
    <motion.h2
      className="text-[2.6rem] font-[900] lowercase leading-tight tracking-tight text-white text-center"
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      choose her build…
    </motion.h2>
    <div className="flex flex-wrap justify-center gap-1.5 pt-1">
      <Pill label="slim" delay={0.15} />
      <Pill label="regular" delay={0.22} />
      <Pill label="curvy" delay={0.29} />
    </div>
  </div>
);

const Screen4 = () => (
  <div className="relative flex flex-col items-center gap-3">
    <EmojiRow screenIndex={3} />
    <motion.h2
      className="text-[2.6rem] font-[900] lowercase leading-tight tracking-tight text-white text-center"
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      pick her nationality…
    </motion.h2>
    <div className="flex flex-wrap justify-center gap-1">
      {["american", "british", "european", "latina"].map((n, i) => (
        <Pill key={n} label={n} delay={0.15 + i * 0.05} />
      ))}
    </div>
  </div>
);

const Screen5 = () => (
  <div className="relative flex flex-col items-center gap-3">
    <EmojiRow screenIndex={4} />
    <motion.h2
      className="text-[2.6rem] font-[900] lowercase leading-tight tracking-tight text-white text-center"
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      set her details…
    </motion.h2>
    <div className="flex flex-col gap-1.5 w-full pt-1">
      <SectionLabel delay={0.15}>age</SectionLabel>
      <div className="flex flex-wrap gap-1">
        {["18", "21", "25", "30", "35", "40"].map((a, i) => (
          <Pill key={a} label={a} delay={0.18 + i * 0.05} />
        ))}
      </div>
      <SectionLabel delay={0.4}>style</SectionLabel>
      <div className="flex flex-wrap gap-1">
        {["natural", "model", "egirl"].map((s, i) => (
          <Pill key={s} label={s} delay={0.43 + i * 0.05} />
        ))}
      </div>
    </div>
  </div>
);

const Screen6 = ({ onGo }: { onGo: () => void }) => (
  <div className="relative flex flex-col items-center gap-6">
    <EmojiRow screenIndex={5} />
    <motion.h2
      className="text-[3rem] font-[900] lowercase leading-tight tracking-tight text-white text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
    >
      ready?
    </motion.h2>
    <motion.button
      onClick={(e) => { e.stopPropagation(); onGo(); }}
      className="mt-2 h-16 w-full max-w-[14rem] rounded-2xl text-[1.4rem] font-[900] lowercase tracking-tight active:scale-[0.95]"
      style={{ background: "hsl(var(--neon-yellow))", color: "#000", transition: "transform 0.05s" }}
      initial={{ opacity: 0, y: 12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.25, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      whileTap={{ scale: 0.93 }}
    >
      let's go
    </motion.button>
  </div>
);

const screens = [Screen1, Screen2, Screen3, Screen4, Screen5];

/* ═══════════ MAIN ═══════════ */

interface IntroSequenceProps {
  open: boolean;
  onComplete: () => void;
}

const IntroSequence = ({ open, onComplete }: IntroSequenceProps) => {
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const animating = useRef(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) { setStep(0); animating.current = false; }
  }, [open]);

  const goTo = useCallback((next: number) => {
    if (animating.current) return;
    if (next < 0 || next >= TOTAL || next === step) return;
    animating.current = true;
    setStep(next);
    setTimeout(() => { animating.current = false; }, 400);
  }, [step]);

  const advance = useCallback(() => goTo(step + 1), [goTo, step]);
  const goBack = useCallback(() => goTo(step - 1), [goTo, step]);

  const handleTap = useCallback(() => {
    if (step < TOTAL - 1) advance();
  }, [step, advance]);

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
    return () => {
      document.body.style.overflow = prev.body;
      document.documentElement.style.overflow = prev.html;
      if (root) root.style.overflow = prev.root;
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col bg-black cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleTap}
        >
          {/* Screen content + nav together, vertically centred */}
          <div className="flex-1 flex items-center justify-center px-16 overflow-hidden">
            <div className="w-full max-w-xs mx-auto flex flex-col items-center gap-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  {step < 5 && (() => { const S = screens[step]; return <S />; })()}
                  {step === 5 && <Screen6 onGo={onComplete} />}
                </motion.div>
              </AnimatePresence>

              {/* Arrows + dots — directly under content */}
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-4">
                  <NavArrow direction="left" onClick={goBack} disabled={step === 0} />
                  <NavArrow direction="right" onClick={step === TOTAL - 1 ? onComplete : advance} />
                </div>
                <Dots current={step} total={TOTAL} />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default IntroSequence;
