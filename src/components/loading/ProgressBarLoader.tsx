import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [0, 13, 27, 41, 58, 73, 89, 96, 100];
const PHRASE_FADE_IN_DURATION = 0.95;
const PHRASE_FADE_OUT_DURATION = 0.65;
const PHRASE_GAP_MS = 650;

interface ProgressBarLoaderProps {
  duration?: number;
  phrases: string[];
  phraseInterval?: number;
  onComplete?: () => void;
  requireTapToContinue?: boolean;
  expandTapTarget?: boolean;
  /** When set to true, smoothly accelerates to 100% regardless of elapsed time */
  completeNow?: boolean;
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
}: ProgressBarLoaderProps) => {
  const [pct, _setPct] = useState(0);
  const pctRef = useRef(0);

  // Wrapper that ensures pct only ever increases — uses functional updater
  // so React always sees the latest committed state
  const setPct = useCallback((next: number) => {
    _setPct((prev) => {
      const safeNext = Math.max(next, prev, pctRef.current);
      pctRef.current = safeNext;
      return safeNext;
    });
  }, []);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [phraseVisible, setPhraseVisible] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const completedRef = useRef(false);
  const continuedRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const safePhrases = useMemo(() => (phrases.length > 0 ? phrases : ["working…"]), [phrases]);
  const effectivePhraseInterval = Math.max(phraseInterval, 4200);
  const maxPctRef = useRef(0);

  useEffect(() => {
    startTimeRef.current = Date.now();
    completedRef.current = false;
    continuedRef.current = false;
    maxPctRef.current = 0;
    pctRef.current = 0;
    _setPct(0);
    setPhraseIndex(0);
    setPhraseVisible(true);
    setIsComplete(false);

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const newPct = mapProgressToPct(progress);
      maxPctRef.current = Math.max(maxPctRef.current, newPct);
      setPct(maxPctRef.current);

      if (progress >= 1) {
        if (!completedRef.current) {
          completedRef.current = true;
          maxPctRef.current = 100;
          setPct(100);
          setIsComplete(true);
          if (!requireTapToContinue && !continuedRef.current) {
            continuedRef.current = true;
            window.setTimeout(() => onCompleteRef.current?.(), 250);
          }
        }
      }
    };

    updateProgress();
    const intervalId = window.setInterval(updateProgress, 120);
    const syncFromElapsedTime = () => updateProgress();
    document.addEventListener("visibilitychange", syncFromElapsedTime);
    window.addEventListener("focus", syncFromElapsedTime);
    window.addEventListener("pageshow", syncFromElapsedTime);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", syncFromElapsedTime);
      window.removeEventListener("focus", syncFromElapsedTime);
      window.removeEventListener("pageshow", syncFromElapsedTime);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [duration, requireTapToContinue]);

  // completeNow: smoothly accelerate to 100%
  useEffect(() => {
    if (!completeNow || completedRef.current) return;
    const startPct = maxPctRef.current;
    const startTs = Date.now();
    const accelDuration = 1200; // ms to reach 100%
    const tick = () => {
      const elapsed = Date.now() - startTs;
      const t = Math.min(elapsed / accelDuration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      const newPct = Math.round(startPct + (100 - startPct) * eased);
      maxPctRef.current = Math.max(maxPctRef.current, newPct);
      setPct(maxPctRef.current);
      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        if (!completedRef.current) {
          completedRef.current = true;
          maxPctRef.current = 100;
          setPct(100);
          setIsComplete(true);
          if (!requireTapToContinue && !continuedRef.current) {
            continuedRef.current = true;
            window.setTimeout(() => onCompleteRef.current?.(), 250);
          }
        }
      }
    };
    requestAnimationFrame(tick);
  }, [completeNow, requireTapToContinue]);

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
        className={`relative z-10 flex w-full flex-col items-center gap-5 px-10 pt-10 ${isComplete && requireTapToContinue ? "cursor-pointer" : ""}`}
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
            opacity: { duration: 0.5, delay: 0.1, ease: "easeOut" },
            y: { duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 0.1 },
          }}
        >
          ⚙️
        </motion.span>

        <motion.div
          className="w-full max-w-xs flex flex-col gap-2.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        >
          <div className="relative w-full h-4 rounded-full border-2 border-white/40 overflow-hidden bg-transparent">
            <div
              className="h-full rounded-full"
              style={{
                width: `${pct}%`,
                minWidth: `${pct}%`,
                transition: "width 350ms cubic-bezier(0.4, 0, 0.2, 1), min-width 350ms cubic-bezier(0.4, 0, 0.2, 1)",
                willChange: "width",
                background: "linear-gradient(90deg, hsl(var(--loader-bar-from)) 0%, hsl(var(--loader-bar-from)) 85%, hsl(var(--loader-bar-to)) 100%)",
              }}
            />
          </div>
          <div className="flex justify-end">
            <span className="text-[13px] font-[900] lowercase text-white/60">{pct}%</span>
          </div>
        </motion.div>

        <motion.div
          className="flex h-8 items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
        >
          <AnimatePresence mode="wait">
            {isComplete && requireTapToContinue ? (
              <motion.p
                key="tap-to-continue"
                className="text-center text-[1.1rem] font-[900] lowercase text-white/60"
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
                className="text-center text-[1.1rem] font-[900] lowercase text-white"
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