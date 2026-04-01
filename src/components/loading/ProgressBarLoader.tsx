import { useEffect, useMemo, useRef, useState } from "react";
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
}: ProgressBarLoaderProps) => {
  const [pct, setPct] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [phraseVisible, setPhraseVisible] = useState(true);
  const [isComplete, setIsComplete] = useState(false);
  const completedRef = useRef(false);
  const continuedRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const safePhrases = useMemo(() => (phrases.length > 0 ? phrases : ["working…"]), [phrases]);
  const effectivePhraseInterval = Math.max(phraseInterval, 4200);
  const maxPctRef = useRef(0);

  useEffect(() => {
    startTimeRef.current = Date.now();
    completedRef.current = false;
    continuedRef.current = false;
    maxPctRef.current = 0;
    setPct(0);
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
            window.setTimeout(() => onComplete?.(), 250);
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
  }, [duration, onComplete, requireTapToContinue]);

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
        className={`relative z-10 flex w-full flex-col items-center gap-5 px-10 pt-14 ${isComplete && requireTapToContinue ? "cursor-pointer" : ""}`}
        onClick={handleContinue}
        onKeyDown={handleKeyDown}
        role={isComplete && requireTapToContinue ? "button" : undefined}
        tabIndex={isComplete && requireTapToContinue ? 0 : -1}
        aria-label={isComplete && requireTapToContinue ? "tap to continue" : undefined}
      >
        <span
          className="text-[3rem] inline-block select-none animate-bounce"
          style={{ animationDuration: "2.2s" }}
        >
          ⚙️
        </span>

        <div className="w-full max-w-xs flex flex-col gap-2">
          <div className="relative w-full h-4 rounded-full border-2 border-white/40 overflow-hidden bg-transparent">
            <div
              className="h-full rounded-full transition-all ease-out"
              style={{
                width: `${pct}%`,
                transitionDuration: "300ms",
                background: "hsl(var(--neon-yellow))",
              }}
            />
          </div>
          <div className="flex justify-end">
            <span className="text-xs font-extrabold lowercase text-white/60">{pct}%</span>
          </div>
        </div>

        <div className="-mt-0.5 flex h-8 items-center justify-center">
          <AnimatePresence mode="wait" initial={false}>
            {isComplete && requireTapToContinue ? (
              <motion.p
                key="tap-to-continue"
                className="text-center text-[1.05rem] font-extrabold lowercase text-white/60"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, -4, 0] }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: PHRASE_FADE_IN_DURATION, delay: 0.2, ease: "easeInOut" },
                  y: { duration: 2.2, repeat: Infinity, ease: "easeInOut" },
                }}
              >
                tap to continue
              </motion.p>
            ) : phraseVisible ? (
              <motion.p
                key={safePhrases[phraseIndex]}
                className="text-center text-[1.05rem] font-extrabold lowercase text-white"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, -4, 0] }}
                exit={{ opacity: 0 }}
                transition={{
                  opacity: { duration: PHRASE_FADE_IN_DURATION, delay: 0.2, ease: "easeInOut" },
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
        </div>
      </div>
    </>
  );
};

export default ProgressBarLoader;