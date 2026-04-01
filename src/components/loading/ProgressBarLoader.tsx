import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const STEPS = [0, 13, 27, 41, 58, 73, 89, 96, 100];

interface ProgressBarLoaderProps {
  duration?: number;
  phrases: string[];
  phraseInterval?: number;
  onComplete?: () => void;
}

const ProgressBarLoader = ({
  duration = 25000,
  phrases,
  phraseInterval = 4500,
  onComplete,
}: ProgressBarLoaderProps) => {
  const [pct, setPct] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const completedRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const safePhrases = phrases.length > 0 ? phrases : ["working…"];

  // Elapsed-time based progress — survives tab switches
  useEffect(() => {
    if (completedRef.current) return;
    startTimeRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);

      // Map progress to STEPS
      const stepFloat = progress * (STEPS.length - 1);
      const stepLow = Math.floor(stepFloat);
      const stepHigh = Math.min(stepLow + 1, STEPS.length - 1);
      const frac = stepFloat - stepLow;
      const currentPct = Math.round(STEPS[stepLow] + (STEPS[stepHigh] - STEPS[stepLow]) * frac);

      setPct(currentPct);

      if (progress >= 1) {
        if (!completedRef.current) {
          completedRef.current = true;
          setTimeout(() => onComplete?.(), 600);
        }
        return;
      }
      rafId = requestAnimationFrame(tick);
    };

    let rafId = requestAnimationFrame(tick);

    // Also handle visibility change — recalc on tab return
    const onVisible = () => {
      if (document.visibilityState === "visible" && !completedRef.current) {
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(tick);
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [duration, onComplete]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % safePhrases.length);
    }, phraseInterval);
    return () => clearInterval(interval);
  }, [safePhrases.length, phraseInterval]);

  return (
    <div className="flex w-full flex-col items-center gap-5 px-10">
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
          <span className="text-xs font-extrabold lowercase text-white/60">
            {pct}%
          </span>
        </div>
      </div>

      {/* Cycling phrases with bounce */}
      <div className="-mt-1 flex h-8 items-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={safePhrases[phraseIndex]}
            className="text-center text-[1rem] font-extrabold lowercase text-white animate-bounce"
            style={{ animationDuration: "2.2s" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          >
            {safePhrases[phraseIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProgressBarLoader;
