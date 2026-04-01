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
  phraseInterval = 3500,
  onComplete,
}: ProgressBarLoaderProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const completedRef = useRef(false);
  const safePhrases = phrases.length > 0 ? phrases : ["working…"];

  const pct = STEPS[stepIndex] ?? 0;

  useEffect(() => {
    if (stepIndex >= STEPS.length - 1) {
      if (!completedRef.current) {
        completedRef.current = true;
        const t = setTimeout(() => onComplete?.(), 1000);
        return () => clearTimeout(t);
      }
      return;
    }
    const stepDuration = duration / (STEPS.length - 1);
    const jitter = (Math.random() - 0.5) * stepDuration * 0.3;
    const t = setTimeout(() => setStepIndex((i) => i + 1), stepDuration + jitter);
    return () => clearTimeout(t);
  }, [stepIndex, duration, onComplete]);

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
              transitionDuration: `${duration / (STEPS.length - 1)}ms`,
              background: "linear-gradient(90deg, hsl(310 85% 55%), hsl(270 80% 55%))",
            }}
          />
        </div>

        <div className="flex justify-end">
          <span className="text-xs font-extrabold lowercase text-white/60">
            {pct}%
          </span>
        </div>
      </div>

      {/* Cycling phrases */}
      <div className="-mt-1 flex h-8 items-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={safePhrases[phraseIndex]}
            className="text-center text-sm font-extrabold lowercase text-white"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.34, 1.56, 0.64, 1] }}
          >
            {safePhrases[phraseIndex]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ProgressBarLoader;
