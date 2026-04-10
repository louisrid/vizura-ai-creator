import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [0, 13, 27, 41, 58, 73, 89, 96, 100];
const PHRASE_FADE_IN_DURATION = 0.95;
const PHRASE_FADE_OUT_DURATION = 0.65;
const PHRASE_GAP_MS = 650;
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
  requireTapToContinue = false,
  expandTapTarget = false,
  completeNow = false,
  progressOverride,
}: ProgressBarLoaderProps) => {
  const [pct, setPctState] = useState(0);
  const pctRef = useRef(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [phraseVisible, setPhraseVisible] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const completedRef = useRef(false);
  const continuedRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const onCompleteRef = useRef(onComplete);
  const animationFrameRef = useRef<number | null>(null);
  const accelStartRef = useRef<number | null>(null);
  const accelStartPctRef = useRef(0);
  const isControlled = typeof progressOverride === "number";

  onCompleteRef.current = onComplete;

  const safePhrases = useMemo(() => (phrases.length > 0 ? phrases : ["working…"]), [phrases]);
  const effectivePhraseInterval = Math.max(phraseInterval, 4200);
  const contentStyle = useMemo(() => ({ width: FIXED_CONTENT_WIDTH, maxWidth: "100%" }), []);

  const setPct = useCallback((next: number) => {
    const capped = Math.min(next, 100);
    const safeNext = Math.max(capped, pctRef.current);
    if (safeNext === pctRef.current) return;
    pctRef.current = safeNext;
    setPctState(safeNext);
  }, []);

  const finish = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    accelStartRef.current = null;
    setPct(100);
    // Delay showing "tap to continue" until the CSS bar transition (120ms) visually reaches 100%
    window.setTimeout(() => {
      setIsComplete(true);

      if (!requireTapToContinue && !continuedRef.current) {
        continuedRef.current = true;
        window.setTimeout(() => onCompleteRef.current?.(), 250);
      }
    }, 150);
  }, [requireTapToContinue, setPct]);

  const updateProgress = useCallback((timestamp: number) => {
    if (completedRef.current) return;

    let nextPct = pctRef.current;

    if (accelStartRef.current !== null) {
      const t = Math.min((timestamp - accelStartRef.current) / ACCEL_DURATION_MS, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      nextPct = Math.round(accelStartPctRef.current + (100 - accelStartPctRef.current) * eased);
    } else {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      nextPct = mapProgressToPct(progress);
      if (progress >= 1) nextPct = 100;
    }

    setPct(nextPct);
    if (nextPct >= 100) finish();
  }, [duration, finish, setPct]);

  const scheduleNextFrame = useCallback((timestamp: number) => {
    updateProgress(timestamp);
    if (!completedRef.current) {
      animationFrameRef.current = window.requestAnimationFrame(scheduleNextFrame);
    }
  }, [updateProgress]);

  useEffect(() => {
    startTimeRef.current = Date.now();
    completedRef.current = false;
    continuedRef.current = false;
    accelStartRef.current = null;
    accelStartPctRef.current = 0;
    pctRef.current = 0;
    setPctState(0);
    setPhraseIndex(0);
    setPhraseVisible(true);
    setIsComplete(false);

    if (isControlled) {
      return;
    }

    updateProgress(window.performance.now());
    animationFrameRef.current = window.requestAnimationFrame(scheduleNextFrame);

    const syncFromElapsedTime = () => updateProgress(window.performance.now());
    document.addEventListener("visibilitychange", syncFromElapsedTime);
    window.addEventListener("focus", syncFromElapsedTime);
    window.addEventListener("pageshow", syncFromElapsedTime);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      document.removeEventListener("visibilitychange", syncFromElapsedTime);
      window.removeEventListener("focus", syncFromElapsedTime);
      window.removeEventListener("pageshow", syncFromElapsedTime);
    };
  }, [isControlled, scheduleNextFrame, updateProgress]);

  useEffect(() => {
    if (!isControlled) return;
    const next = Math.max(0, Math.min(100, Math.round(progressOverride ?? 0)));
    setPct(next);
    if (next >= 100) finish();
  }, [finish, isControlled, progressOverride, setPct]);

  useEffect(() => {
    if (!completeNow || completedRef.current || accelStartRef.current !== null) return;
    accelStartRef.current = window.performance.now();
    accelStartPctRef.current = pctRef.current;
  }, [completeNow]);

  useEffect(() => {
    if (isComplete || safePhrases.length <= 1) {
      setPhraseVisible(true);
      return;
    }
    setPhraseVisible(true);
    const fadeOutTimer = window.setTimeout(() => setPhraseVisible(false), effectivePhraseInterval);
    const nextPhraseTimer = window.setTimeout(() => {
      setPhraseIndex((i) => (i + 1) % safePhrases.length);
    }, effectivePhraseInterval + Math.round(PHRASE_FADE_OUT_DURATION * 1000) + PHRASE_GAP_MS);
    return () => {
      window.clearTimeout(fadeOutTimer);
      window.clearTimeout(nextPhraseTimer);
    };
  }, [effectivePhraseInterval, isComplete, phraseIndex, safePhrases.length]);

  const handleContinue = () => {
    if (!isComplete || continuedRef.current) return;
    continuedRef.current = true;
    onComplete?.();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleContinue();
  };

  return (
    <>
      {/* Full-screen tap target when complete */}
      {expandTapTarget && isComplete && requireTapToContinue && (
        <button
          type="button"
          className="fixed inset-0 z-0 cursor-pointer"
          onClick={handleContinue}
          aria-label="tap to continue"
        />
      )}
      <div
        className={`relative z-10 flex flex-col items-center gap-5 px-2 -translate-y-8 md:-translate-y-12 ${isComplete && requireTapToContinue ? "cursor-pointer" : ""}`}
        style={{ ...contentStyle, overflow: "hidden", touchAction: "none" }}
        
        onClick={handleContinue}
        onKeyDown={handleKeyDown}
        role={isComplete && requireTapToContinue ? "button" : undefined}
        tabIndex={isComplete && requireTapToContinue ? 0 : -1}
        aria-label={isComplete && requireTapToContinue ? "tap to continue" : undefined}
      >
        <motion.span
          className="text-[3.5rem] inline-block select-none"
          initial={{ opacity: 0, y: 0 }}
          animate={{ opacity: 1, y: [0, -5, 0] }}
          transition={{
            opacity: { duration: 0.7, delay: 0.1, ease: "easeOut" },
            y: { duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.1 },
          }}
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
            {isComplete && requireTapToContinue ? (
              <motion.p
                key="tap-to-continue"
                className="text-center text-[1.3rem] font-[900] lowercase"
                style={{ color: "hsl(140, 100%, 50%)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, -4, 0] }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: PHRASE_FADE_IN_DURATION, delay: 0, ease: "easeInOut" },
                  y: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                }}
              >
                tap to continue
              </motion.p>
            ) : phraseVisible ? (
              <motion.p
                key={safePhrases[phraseIndex]}
                className="text-center text-[1.3rem] font-[900] lowercase text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, -4, 0] }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: PHRASE_FADE_IN_DURATION, delay: 0, ease: "easeInOut" },
                  y: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                }}
              >
                {safePhrases[phraseIndex]}
              </motion.p>
            ) : (
              <motion.div
                key={`phrase-gap-${phraseIndex}`}
                className="h-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: PHRASE_FADE_OUT_DURATION, ease: "easeInOut" }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </>
  );
};

export default ProgressBarLoader;