import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [0, 5, 12, 20, 30, 42, 55, 68, 78, 86, 92, 96, 98, 100];
const ACCEL_DURATION_MS = 600;
const FIXED_CONTENT_WIDTH = "min(24rem, calc(100vw - 5rem))";

interface ProgressBarLoaderProps {
  duration?: number;
  phrases: string[];
  phraseInterval?: number;
  onComplete?: () => void;
  /** When set to true, smoothly accelerates to 100% regardless of elapsed time */
  completeNow?: boolean;
  /** Controlled progress value from 0-100 for async work */
  progressOverride?: number;
}

const mapProgressToPct = (progress: number) => {
  const stepFloat = progress * (STEPS.length - 1);
  const stepLow = Math.floor(stepFloat);
  const stepHigh = Math.min(stepLow + 1, STEPS.length - 1);
  const frac = stepFloat - stepLow;
  return Math.round(STEPS[stepLow] + (STEPS[stepHigh] - STEPS[stepLow]) * frac);
};

const ProgressBarLoader = ({
  duration = 25000,
  phrases,
  phraseInterval = 4500,
  onComplete,
  completeNow = false,
  progressOverride,
}: ProgressBarLoaderProps) => {
  const [pct, setPctState] = useState(0);
  const highWaterRef = useRef(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const completedRef = useRef(false);
  const continuedRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const onCompleteRef = useRef(onComplete);
  const animationFrameRef = useRef<number | null>(null);
  const accelStartRef = useRef<number | null>(null);
  const accelStartPctRef = useRef(0);
  const pausedAtRef = useRef<number | null>(null);
  const totalPausedRef = useRef(0);
  const isControlled = typeof progressOverride === "number";

  onCompleteRef.current = onComplete;

  const safePhrases = useMemo(() => (phrases.length > 0 ? phrases : ["working…"]), [phrases]);
  const effectivePhraseInterval = Math.max(phraseInterval, 4200);
  const contentStyle = useMemo(() => ({ width: FIXED_CONTENT_WIDTH, maxWidth: "100%" }), []);

  /** Only ever moves forward */
  const setPct = useCallback((next: number) => {
    const capped = Math.min(next, 100);
    const safeNext = Math.max(capped, highWaterRef.current);
    if (safeNext === highWaterRef.current) return;
    highWaterRef.current = safeNext;
    setPctState(safeNext);
  }, []);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    accelStartRef.current = null;
    setPct(100);
    window.setTimeout(() => {
      setIsComplete(true);
      if (!continuedRef.current) {
        continuedRef.current = true;
        onCompleteRef.current?.();
      }
    }, 150);
  }, [setPct]);

  const getElapsed = useCallback(() => {
    return Date.now() - startTimeRef.current - totalPausedRef.current;
  }, []);

  const tick = useCallback(() => {
    if (completedRef.current) return;
    if (document.hidden) return;

    let nextPct = highWaterRef.current;

    if (accelStartRef.current !== null) {
      const t = Math.min((performance.now() - accelStartRef.current) / ACCEL_DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      nextPct = Math.round(accelStartPctRef.current + (100 - accelStartPctRef.current) * eased);
    } else {
      const elapsed = getElapsed();
      const progress = Math.min(elapsed / duration, 1);
      nextPct = mapProgressToPct(progress);
      if (progress >= 1) nextPct = 100;
    }

    setPct(nextPct);
    if (nextPct >= 100) finish();
  }, [duration, finish, getElapsed, setPct]);

  const loop = useCallback((_ts: number) => {
    tick();
    if (!completedRef.current) {
      animationFrameRef.current = requestAnimationFrame(loop);
    }
  }, [tick]);

  // Visibility change: pause/resume elapsed tracking
  useEffect(() => {
    if (isControlled) return;

    const onVisChange = () => {
      if (document.hidden) {
        pausedAtRef.current = Date.now();
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      } else {
        if (pausedAtRef.current !== null) {
          totalPausedRef.current += Date.now() - pausedAtRef.current;
          pausedAtRef.current = null;
        }
        if (!completedRef.current && animationFrameRef.current === null) {
          tick();
          animationFrameRef.current = requestAnimationFrame(loop);
        }
      }
    };

    document.addEventListener("visibilitychange", onVisChange);
    return () => document.removeEventListener("visibilitychange", onVisChange);
  }, [isControlled, tick, loop]);

  // Main animation loop
  useEffect(() => {
    startTimeRef.current = Date.now();
    completedRef.current = false;
    continuedRef.current = false;
    accelStartRef.current = null;
    accelStartPctRef.current = 0;
    highWaterRef.current = 0;
    totalPausedRef.current = 0;
    pausedAtRef.current = null;
    setPctState(0);
    setPhraseIndex(0);
    setIsComplete(false);

    if (isControlled) return;

    tick();
    animationFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled]);

  useEffect(() => {
    if (!isControlled) return;
    const next = Math.max(0, Math.min(100, Math.round(progressOverride ?? 0)));
    setPct(next);
    if (next >= 100) finish();
  }, [finish, isControlled, progressOverride, setPct]);

  useEffect(() => {
    if (!completeNow || completedRef.current || accelStartRef.current !== null) return;
    accelStartRef.current = performance.now();
    accelStartPctRef.current = highWaterRef.current;
  }, [completeNow]);

  // Phrase cycling — always visible, just swap text
  useEffect(() => {
    if (isComplete || safePhrases.length <= 1) return;
    const interval = window.setInterval(() => {
      setPhraseIndex((i) => (i + 1) % safePhrases.length);
    }, effectivePhraseInterval);
    return () => window.clearInterval(interval);
  }, [effectivePhraseInterval, isComplete, safePhrases.length]);

  return (
    <div
      className="relative z-10 flex flex-col items-center gap-5 px-2"
      style={{ ...contentStyle, overflow: "hidden", touchAction: "none" }}
    >
      <motion.span
        className="text-[3.5rem] inline-block select-none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
      >
        🦊
      </motion.span>

      <motion.div
        className="w-full flex flex-col gap-2.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.2, ease: "easeOut" }}
      >
        <div className="relative w-full h-4 rounded-full border-2 border-white/40 overflow-hidden bg-transparent">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              transform: `scaleX(${pct / 100})`,
              transformOrigin: "left center",
              transition: "transform 120ms linear",
              willChange: "transform",
              background: "linear-gradient(90deg, #00e0ff 0%, #00e0ff 85%, #00bcd4 100%)",
            }}
          />
        </div>
        <div className="flex justify-end">
          <span className="min-w-[3ch] text-right text-[13px] font-[900] lowercase tabular-nums" style={{ color: "#ffffff" }}>{pct}%</span>
        </div>
      </motion.div>

      <motion.div
        className="flex h-8 items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.3, ease: "easeOut" }}
      >
        <AnimatePresence mode="wait">
          <motion.p
            key={safePhrases[phraseIndex]}
            className="text-center text-[1.3rem] font-[900] lowercase text-white"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            {safePhrases[phraseIndex]}
          </motion.p>
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ProgressBarLoader;
