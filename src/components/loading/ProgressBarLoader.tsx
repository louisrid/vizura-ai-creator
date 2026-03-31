import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Progress bar loader with cog emoji, percentage, and cycling phrases.
 * Percentage jumps to realistic-looking numbers rather than ticking every 1%.
 */

const STEPS = [0, 13, 27, 41, 58, 73, 89, 96, 100];

interface ProgressBarLoaderProps {
  /** Duration in ms to go from 0→100% */
  duration?: number;
  /** Phrases to cycle through */
  phrases: string[];
  /** Interval between phrase changes in ms */
  phraseInterval?: number;
  /** Called when progress reaches 100% */
  onComplete?: () => void;
}

const ProgressBarLoader = ({
  duration = 8000,
  phrases,
  phraseInterval = 3500,
  onComplete,
}: ProgressBarLoaderProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const completedRef = useRef(false);

  const pct = STEPS[stepIndex] ?? 0;

  // Progress steps
  useEffect(() => {
    if (stepIndex >= STEPS.length - 1) {
      if (!completedRef.current) {
        completedRef.current = true;
        // Hold at 100% for a beat before completing
        const t = setTimeout(() => onComplete?.(), 1000);
        return () => clearTimeout(t);
      }
      return;
    }
    const stepDuration = duration / (STEPS.length - 1);
    // Add slight randomness to feel natural
    const jitter = (Math.random() - 0.5) * stepDuration * 0.3;
    const t = setTimeout(() => setStepIndex((i) => i + 1), stepDuration + jitter);
    return () => clearTimeout(t);
  }, [stepIndex, duration, onComplete]);

  // Phrase cycling
  useEffect(() => {
    const interval = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % phrases.length);
    }, phraseInterval);
    return () => clearInterval(interval);
  }, [phrases, phraseInterval]);

  return (
    <div className="flex flex-col items-center gap-6 w-full px-10">
      {/* Cog emoji bouncing */}
      <span
        className="text-[3rem] inline-block select-none animate-bounce"
        style={{ animationDuration: "2.2s" }}
      >
        ⚙️
      </span>

      {/* Progress bar */}
      <div className="w-full max-w-xs flex flex-col gap-2">
        <div className="relative w-full h-4 rounded-full border-2 border-white/40 overflow-hidden bg-transparent">
          <div
            className="h-full rounded-full transition-all ease-out"
            style={{
              width: `${pct}%`,
              transitionDuration: `${duration / (STEPS.length - 1)}ms`,
              background: "linear-gradient(90deg, hsl(var(--loader-cyan)), hsl(var(--loader-blue)))",
            }}
          />
        </div>

        {/* Percentage */}
        <div className="flex justify-end">
          <span className="text-xs font-extrabold lowercase text-white/60">
            {pct}%
          </span>
        </div>
      </div>

      {/* Cycling phrases */}
      <div className="h-8 flex items-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={phrases[phraseIndex]}
            className="text-center text-sm font-extrabold lowercase text-white"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {phrases[phraseIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProgressBarLoader;
