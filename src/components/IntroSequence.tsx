import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { IntroDots, IntroNavArrow, LIGHT_BLUE } from "./overlay/IntroSequencePrimitives";

const TOTAL = 6;
/* ── per-screen emojis ── */
const screenEmojis: string[][] = [
  ["🖌️"],
  ["✨"],
  ["🫧"],
  ["🇺🇸"],
  ["⚙️"],
  ["🚀"],
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

/* ── single emoji ── */
const BigEmoji = ({ emoji, delay = 0, screenIndex = 0 }: { emoji: string; delay?: number; screenIndex?: number }) => {
  const motion_cfg = emojiMotions[screenIndex % emojiMotions.length];
  return (
    <motion.span
      className="select-none pointer-events-none text-[3.5rem]"
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

/* ── mock pill (compact) ── */
const Pill = ({ label, delay = 0 }: { label: string; delay?: number }) => (
  <motion.div
    className="flex h-6 items-center justify-center rounded-md px-3"
    style={{ background: "hsl(0 0% 100% / 0.08)" }}
    initial={{ opacity: 0, y: 6, scale: 0.92 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
  >
    <span className="text-[0.65rem] font-[800] lowercase tracking-tight text-white">{label}</span>
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

const Dots = IntroDots;
const NavArrow = IntroNavArrow;

/* ── consistent title ── */
const ScreenTitle = ({ children }: { children: React.ReactNode }) => (
  <motion.h2
    className="mb-0 text-center text-[2.2rem] font-[900] lowercase leading-tight tracking-tight text-white"
    initial={{ opacity: 0, y: 12, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
  >
    {children}
  </motion.h2>
);

const ScreenShell = ({
  children,
  screenIndex,
  title,
  contentClassName = "flex-wrap justify-center gap-2",
}: {
  children: React.ReactNode;
  screenIndex: number;
  title: React.ReactNode;
  contentClassName?: string;
}) => (
  <div className="relative flex w-full flex-col items-center">
    <div className="flex h-12 items-end justify-center">
      <EmojiRow screenIndex={screenIndex} />
    </div>
    <div className="mt-1.5 flex w-full flex-col items-center">
      <ScreenTitle>{title}</ScreenTitle>
      <div className={`mt-3 flex w-full ${contentClassName}`}>
        {children}
      </div>
    </div>
  </div>
);

/* ═══════════ SCREENS ═══════════ */

const Screen1 = () => (
  <ScreenShell screenIndex={0} title="pick her style…">
    <Pill label="natural" delay={0.15} />
    <Pill label="model" delay={0.22} />
    <Pill label="egirl" delay={0.29} />
  </ScreenShell>
);

const Screen2 = () => (
  <ScreenShell screenIndex={1} title="set her look…" contentClassName="flex-col gap-1">
    <SectionLabel delay={0.15}>hair colour</SectionLabel>
    <div className="flex gap-1.5">
      {["blonde", "brunette", "black"].map((h, i) => (
        <Pill key={h} label={h} delay={0.18 + i * 0.05} />
      ))}
    </div>
    <SectionLabel delay={0.35}>eye colour</SectionLabel>
    <div className="flex gap-1.5">
      {["brown", "blue", "green"].map((e, i) => (
        <Pill key={e} label={e} delay={0.38 + i * 0.05} />
      ))}
    </div>
  </ScreenShell>
);

const Screen3 = () => (
  <ScreenShell screenIndex={2} title="choose her build…">
    <Pill label="slim" delay={0.15} />
    <Pill label="regular" delay={0.22} />
    <Pill label="curvy" delay={0.29} />
  </ScreenShell>
);

const Screen4 = () => (
  <ScreenShell screenIndex={3} title="pick her nationality…">
    {["american", "british", "european"].map((n, i) => (
      <Pill key={n} label={n} delay={0.15 + i * 0.05} />
    ))}
  </ScreenShell>
);

const Screen5 = () => (
  <ScreenShell screenIndex={4} title="set her details…" contentClassName="flex-col items-start justify-start">
    <motion.p
      className="text-[0.65rem] font-[800] uppercase tracking-widest text-white"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.15, duration: 0.3 }}
    >
      example age
    </motion.p>
    <motion.span
      className="-mt-0.5 text-[3.5rem] font-[900] leading-none text-white"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, duration: 0.4 }}
    >
      27
    </motion.span>
  </ScreenShell>
);

const Screen6 = ({ onGo }: { onGo: () => void }) => (
  <div className="relative flex w-full flex-col items-center">
    <div className="flex h-12 items-end justify-center" />
    <div className="mt-1.5 flex w-full flex-col items-center">
      <ScreenTitle>ready?</ScreenTitle>
      <motion.button
        onClick={(e) => { e.stopPropagation(); onGo(); }}
        className="mt-3 h-14 w-[80vw] max-w-[20rem] rounded-2xl text-[1.4rem] font-[900] lowercase tracking-tight active:scale-[0.95]"
        style={{ background: "hsl(var(--neon-yellow))", color: "#000", transition: "transform 0.05s" }}
        initial={{ opacity: 0, y: 12, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.25, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
        whileTap={{ scale: 0.93 }}
      >
        let's go
      </motion.button>
    </div>
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
  const [skipping, setSkipping] = useState(false);
  const animating = useRef(false);
  const skipIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) { setStep(0); animating.current = false; setSkipping(false); }
  }, [open]);

  const stopSkip = useCallback(() => {
    if (skipIntervalRef.current) {
      clearTimeout(skipIntervalRef.current as unknown as ReturnType<typeof setTimeout>);
      skipIntervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopSkip();
  }, [stopSkip]);

  const handleLongPress = useCallback(() => {
    stopSkip();
    skipIntervalRef.current = setTimeout(() => {
      skipIntervalRef.current = null;
      onComplete();
    }, 500) as unknown as ReturnType<typeof setInterval>;
  }, [onComplete, stopSkip]);

  // Lock scroll
  useEffect(() => {
    if (!open) return;
    stopSkip();
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
  }, [open, stopSkip]);

  // During skip: instant transitions
  const contentTransition = skipping
    ? { duration: 0.08, ease: "linear" as const }
    : { duration: 0.45, ease: [0.25, 0.1, 0.25, 1] as const };

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
          {/* Absolute layout: content pinned at center, nav pinned below */}
          <div className="relative flex-1 overflow-hidden">
            {/* Content zone — pinned at vertical center of screen */}
            <div className="absolute inset-x-0 flex items-center justify-center px-8" style={{ top: "48%", transform: "translateY(-50%)" }}>
              <div className="w-full max-w-xs mx-auto flex flex-col items-center">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, y: skipping ? 0 : 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: skipping ? 0 : -12 }}
                    transition={contentTransition}
                  >
                    {step < 5 && (() => { const S = screens[step]; return <S />; })()}
                    {step === 5 && <Screen6 onGo={onComplete} />}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Nav zone — pinned at fixed position */}
            <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: "68%" }}>
              <div className={`mb-4 flex h-14 items-center gap-4 ${step === TOTAL - 1 ? "invisible" : "visible"}`}>
                <NavArrow direction="left" onClick={goBack} disabled={step === 0 || step === TOTAL - 1} />
                <NavArrow direction="right" onClick={advance} onLongPress={handleLongPress} disabled={step === TOTAL - 1} />
              </div>
              <div className={`flex h-3 items-center ${step === TOTAL - 1 ? "invisible" : "visible"}`}>
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
