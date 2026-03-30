import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const PHRASES = [
  "scanning your face…",
  "mapping your features…",
  "building your look…",
  "training the AI…",
  "perfecting the details…",
  "almost ready…",
  "final touches…",
];

const PHRASE_INTERVAL = 2500;
const COOKING_DURATION = 25000;
const SUCCESS_HOLD = 4000;
const TICK_INTERVAL = 100;

const GreenTick = () => (
  <motion.svg
    width="132"
    height="132"
    viewBox="0 0 132 132"
    fill="none"
    initial={{ opacity: 0, scale: 0.72 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.45, ease: [0.34, 1.56, 0.64, 1] }}
  >
    <motion.circle
      cx="66"
      cy="66"
      r="56"
      stroke="hsl(0 0% 100%)"
      strokeWidth="6"
      fill="none"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 1 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 1.6, ease: "easeInOut" }}
    />
    <motion.path
      d="M42 69 L58 85 L92 49"
      stroke="hsl(0 0% 100%)"
      strokeWidth="7"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      initial={{ pathLength: 0, opacity: 1 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 1.0, delay: 1.45, ease: "easeInOut" }}
    />
  </motion.svg>
);

const PhraseText = ({ phrase }: { phrase: string }) => (
  <motion.p
    key={phrase}
    className="text-center text-base font-extrabold lowercase text-white"
    initial={{ opacity: 0, y: 12, scale: 0.92 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    exit={{ opacity: 0, y: -8 }}
    transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
  >
    {phrase}
  </motion.p>
);

interface CookingOverlayProps {
  open: boolean;
  onComplete: () => void;
}

const CookingOverlay = ({ open, onComplete }: CookingOverlayProps) => {
  const [phase, setPhase] = useState<"cooking" | "success" | "exiting">("cooking");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setPhase("cooking");
      setPhraseIndex(0);
      setProgress(0);
      setVisible(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open || phase !== "cooking") return;
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(100, Math.round((elapsed / COOKING_DURATION) * 100));
      setProgress(pct);
      if (pct >= 100) {
        clearInterval(interval);
        setPhase("success");
      }
    }, TICK_INTERVAL);
    return () => clearInterval(interval);
  }, [open, phase]);

  useEffect(() => {
    if (!open || phase !== "cooking") return;
    const interval = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % PHRASES.length);
    }, PHRASE_INTERVAL);
    return () => clearInterval(interval);
  }, [open, phase]);

  useEffect(() => {
    if (phase !== "success") return;
    const t = setTimeout(() => setPhase("exiting"), SUCCESS_HOLD);
    return () => clearTimeout(t);
  }, [phase]);

  const handleExitComplete = useCallback(() => {
    setVisible(false);
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    if (!visible) return;
    const root = document.getElementById("root");
    const prev = { body: document.body.style.overflow, html: document.documentElement.style.overflow, root: root?.style.overflow ?? "" };
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (root) root.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev.body;
      document.documentElement.style.overflow = prev.html;
      if (root) root.style.overflow = prev.root;
    };
  }, [visible]);

  if (!visible) return null;

  return createPortal(
    <AnimatePresence onExitComplete={handleExitComplete}>
      {phase !== "exiting" && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.4, ease: [0, 0, 0.2, 1] }}
        >
          <AnimatePresence mode="wait">
            {phase === "cooking" && (
              <motion.div
                key="cooking"
                className="flex flex-col items-center gap-8 w-full px-10"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <motion.span className="text-[4rem] font-[900] lowercase tracking-tight text-white">
                  {progress}%
                </motion.span>
                <div className="w-full max-w-xs h-3 rounded-full bg-white/10 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{
                      background: "linear-gradient(90deg, hsl(40, 100%, 55%), hsl(185, 100%, 55%), hsl(140, 100%, 50%))",
                      width: `${progress}%`,
                    }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                <div className="h-8 flex items-center">
                  <AnimatePresence mode="wait">
                    <PhraseText phrase={PHRASES[phraseIndex]} />
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
            {phase === "success" && (
              <motion.div
                key="success"
                className="fixed inset-0 flex flex-col items-center justify-center gap-8"
                style={{ backgroundColor: "hsl(var(--member-green))" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
              >
                <GreenTick />
                <motion.p
                  className="text-center text-[2rem] font-extrabold lowercase text-white"
                  initial={{ opacity: 0, y: 18, scale: 0.86 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.55, delay: 2.45, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  character created!
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default CookingOverlay;
