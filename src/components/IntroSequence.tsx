import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { IntroDots, IntroNavArrow, LIGHT_BLUE } from "./overlay/IntroSequencePrimitives";

const TOTAL = 7;
/* ── per-screen emojis (unique per slide) ── */
const screenEmojis: string[][] = [
  ["👁️"],  // 0: welcome
  ["🖌️"],  // 1: pick style
  ["💫"],  // 2: set look
  ["🫧"],  // 3: build
  ["🎨"],  // 4: skin
  ["⚙️"],  // 5: details
  ["🚀"],  // 6: ready
];

/* ── per-screen micro-animation configs — noticeable bounces ── */
const emojiMotions = [
  { y: [0, -18, 0], rotate: [0, 6, -4, 0], scale: [1, 1.12, 1], duration: 2.0 },
  { y: [0, -14, 4, 0], rotate: [0, -10, 8, 0], scale: [1, 1.08, 0.96, 1], duration: 2.2 },
  { y: [0, -16, 0], x: [0, 6, -6, 0], scale: [1, 1.1, 1], duration: 2.4 },
  { y: [0, -20, 2, 0], rotate: [0, 12, -8, 0], scale: [1, 1.1, 0.95, 1], duration: 1.8 },
  { y: [0, -12, 0], rotate: [0, -6, 10, -4, 0], scale: [1, 1.08, 1], duration: 2.6 },
  { y: [0, -22, 0], rotate: [0, 8, -6, 0], scale: [1, 1.14, 0.97, 1], duration: 2.0 },
  { y: [0, -16, 4, 0], rotate: [0, -8, 6, 0], scale: [1, 1.1, 1], duration: 2.2 },
];

/* ── ambient glow background ── */
const AmbientGlow = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <motion.div
      className="absolute rounded-full blur-[120px]"
      style={{
        width: "70%",
        height: "70%",
        top: "20%",
        left: "15%",
        background: "radial-gradient(circle, hsl(260 80% 30% / 0.15), hsl(220 90% 20% / 0.08), transparent 70%)",
      }}
      animate={{
        x: [0, 40, -30, 0],
        y: [0, -30, 20, 0],
        scale: [1, 1.15, 0.9, 1],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute rounded-full blur-[100px]"
      style={{
        width: "50%",
        height: "50%",
        bottom: "10%",
        right: "5%",
        background: "radial-gradient(circle, hsl(200 80% 25% / 0.12), hsl(240 70% 20% / 0.06), transparent 70%)",
      }}
      animate={{
        x: [0, -35, 25, 0],
        y: [0, 20, -25, 0],
        scale: [1, 0.85, 1.1, 1],
      }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

/* ── single emoji ── */
const BigEmoji = ({ emoji, screenIndex = 0 }: { emoji: string; screenIndex?: number }) => {
  const m = emojiMotions[screenIndex % emojiMotions.length];
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

/* ── emoji row ── */
const EmojiRow = ({ screenIndex }: { screenIndex: number }) => {
  const emojis = screenEmojis[screenIndex] || ["✨"];
  return (
    <div className="flex items-center justify-center gap-4">
      {emojis.map((e) => (
        <BigEmoji key={e} emoji={e} screenIndex={screenIndex} />
      ))}
    </div>
  );
};

/* ── mock pill (compact) ── */
const Pill = ({ label }: { label: string }) => (
  <div
    className="flex h-6 items-center justify-center rounded-md px-3"
    style={{ background: "hsl(0 0% 100% / 0.08)" }}
  >
    <span className="text-[0.65rem] font-[800] lowercase tracking-tight text-white">{label}</span>
  </div>
);

/* ── section label ── */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[0.5rem] font-bold uppercase tracking-widest text-white">
    {children}
  </p>
);

const Dots = IntroDots;
const NavArrow = IntroNavArrow;

/* ── consistent title ── */
const ScreenTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mb-0 text-center text-[2.2rem] font-[900] lowercase leading-tight tracking-tight text-white">
    {children}
  </h2>
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

const ScreenWelcome = () => (
  <div className="relative flex w-full flex-col items-center">
    <div className="flex h-12 items-end justify-center">
      <BigEmoji emoji="👁️" screenIndex={0} />
    </div>
    <div className="mt-1.5 flex w-full flex-col items-center">
      <ScreenTitle>welcome to vizura</ScreenTitle>
    </div>
  </div>
);

const Screen1 = () => (
  <ScreenShell screenIndex={1} title="pick her style…">
    <Pill label="natural" />
    <Pill label="model" />
    <Pill label="egirl" />
  </ScreenShell>
);

const Screen2 = () => (
  <ScreenShell screenIndex={2} title="set her look…" contentClassName="flex-col gap-1">
    <SectionLabel>hair colour</SectionLabel>
    <div className="flex gap-1.5">
      {["blonde", "brunette", "black"].map((h) => (
        <Pill key={h} label={h} />
      ))}
    </div>
    <SectionLabel>eye colour</SectionLabel>
    <div className="flex gap-1.5">
      {["brown", "blue", "green"].map((e) => (
        <Pill key={e} label={e} />
      ))}
    </div>
  </ScreenShell>
);

const Screen3 = () => (
  <ScreenShell screenIndex={3} title="choose her build…">
    <Pill label="slim" />
    <Pill label="regular" />
    <Pill label="curvy" />
  </ScreenShell>
);

const Screen4 = () => (
  <ScreenShell screenIndex={4} title="pick her skin…">
    {["pale", "tan", "asian"].map((n) => (
      <Pill key={n} label={n} />
    ))}
  </ScreenShell>
);

const Screen5 = () => (
  <ScreenShell screenIndex={5} title="set her details…" contentClassName="flex-col items-start justify-start">
    <p className="text-[0.65rem] font-[800] uppercase tracking-widest text-white">
      example age
    </p>
    <span className="-mt-0.5 text-[3.5rem] font-[900] leading-none text-white">
      27
    </span>
  </ScreenShell>
);

const Screen6 = () => (
  <div className="relative flex w-full flex-col items-center">
    <span className="select-none pointer-events-none text-[5.5rem] mb-2">
      <motion.span
        className="inline-block"
        animate={{ y: [0, -16, 4, 0], rotate: [0, -8, 6, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        🚀
      </motion.span>
    </span>
    <h2 className="text-center text-[3.5rem] font-[900] lowercase leading-none tracking-tight text-white">
      ready?
    </h2>
  </div>
);

const screens = [ScreenWelcome, Screen1, Screen2, Screen3, Screen4, Screen5];

/* ═══════════ MAIN ═══════════ */

interface IntroSequenceProps {
  open: boolean;
  onComplete: () => void;
}

const IntroSequence = ({ open, onComplete }: IntroSequenceProps) => {
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [shattering, setShattering] = useState(false);
  const animating = useRef(false);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) { setStep(0); animating.current = false; setShattering(false); }
  }, [open]);

  const triggerExit = useCallback(() => {
    if (shattering) return;
    setShattering(true);
  }, [shattering]);

  const handleShatterDone = useCallback(() => {
    onComplete();
  }, [onComplete]);

  const stopSkip = useCallback(() => {
    if (skipTimerRef.current) {
      clearTimeout(skipTimerRef.current);
      skipTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => stopSkip(), [stopSkip]);

  const goTo = useCallback((next: number) => {
    if (animating.current) return;
    if (next < 0 || next >= TOTAL || next === step) return;
    animating.current = true;
    setStep(next);
    setTimeout(() => { animating.current = false; }, 80);
  }, [step]);

  const advance = useCallback(() => {
    if (step === TOTAL - 1) { triggerExit(); return; }
    goTo(step + 1);
  }, [goTo, step, triggerExit]);
  const goBack = useCallback(() => goTo(step - 1), [goTo, step]);

  const handleTap = useCallback(() => {
    if (step < TOTAL - 1) advance();
    else triggerExit();
  }, [step, advance, triggerExit]);

  const handleLongPress = useCallback(() => {
    stopSkip();
    skipTimerRef.current = setTimeout(() => {
      skipTimerRef.current = null;
      triggerExit();
    }, 500);
  }, [triggerExit, stopSkip]);

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

  const isLastStep = step === TOTAL - 1;
  const contentTransition = { duration: 0.05, ease: "linear" as const };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence onExitComplete={handleShatterDone}>
      {open && !shattering && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col bg-black cursor-pointer"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.65, ease: [0, 0, 0.2, 1] }}
          onClick={handleTap}
        >
            <AmbientGlow />
            <div className="relative flex-1 overflow-hidden">
              <div className="absolute inset-x-0 flex items-center justify-center px-8" style={{ top: "48%", transform: "translateY(-50%)" }}>
                <div className="w-full max-w-xs mx-auto flex flex-col items-center">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div
                      key={step}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.05, ease: "linear" }}
                    >
                      {step < 6 && (() => { const S = screens[step]; return <S />; })()}
                      {step === 6 && <Screen6 />}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

              <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: "68%" }}>
                {!isLastStep && (
                  <>
                    <div className="mb-4 flex h-14 items-center gap-4">
                      <NavArrow direction="left" onClick={goBack} disabled={step === 0} />
                      <NavArrow direction="right" onClick={advance} onLongPress={handleLongPress} disabled={false} />
                    </div>
                    <div className="flex h-3 items-center">
                      <Dots current={step} total={TOTAL} />
                    </div>
                  </>
                )}
                {isLastStep && (
                  <button
                    onClick={(e) => { e.stopPropagation(); triggerExit(); }}
                    className="h-14 w-[80vw] max-w-[20rem] rounded-2xl text-[1.4rem] font-[900] lowercase tracking-tight active:scale-[0.95]"
                    style={{ background: "hsl(var(--neon-yellow))", color: "#000", transition: "transform 0.05s" }}
                  >
                    let's go
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

export default IntroSequence;
