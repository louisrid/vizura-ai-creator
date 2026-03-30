import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const PHRASES = [
  "mixing the pixels…",
  "adjusting the vibe…",
  "picking the perfect look…",
  "almost there…",
  "adding the finishing touches…",
  "brewing something beautiful…",
  "calibrating cuteness…",
  "loading your masterpiece…",
];

const PHRASE_INTERVAL = 1500;
const LOADING_DURATION = 8000; // 8 seconds
const SUCCESS_HOLD = 5000; // Hold green tick for 5s

/* ── Animated spinner: cycling ring of dots ── */
const Spinner = () => {
  const dotCount = 12;
  return (
    <div className="relative h-20 w-20">
      {Array.from({ length: dotCount }).map((_, i) => {
        const angle = (360 / dotCount) * i;
        const delay = (i / dotCount) * 1.8;
        return (
          <motion.div
            key={i}
            className="absolute left-1/2 top-1/2 h-2.5 w-2.5 rounded-full"
            style={{
              marginLeft: -5,
              marginTop: -5,
              transform: `rotate(${angle}deg) translateY(-32px)`,
            }}
            animate={{
              backgroundColor: [
                "hsl(40 100% 55%)",
                "hsl(185 100% 55%)",
                "hsl(140 100% 50%)",
                "hsl(40 100% 55%)",
              ],
              scale: [0.6, 1, 0.6],
              opacity: [0.3, 1, 0.3],
            }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
              delay,
            }}
          />
        );
      })}
    </div>
  );
};

/* ── Green tick with slow dramatic stroke draw ── */
const GreenTick = () => (
  <div className="relative">
    {/* Green glow pulse behind tick */}
    <motion.div
      className="absolute inset-0 rounded-full"
      style={{ filter: "blur(20px)", background: "hsl(140 100% 50% / 0.3)" }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: [1, 1.3, 1], opacity: [0.4, 0.7, 0.4] }}
      transition={{ duration: 2, repeat: Infinity, delay: 2.5, ease: "easeInOut" }}
    />
    <motion.svg
      width="80"
      height="80"
      viewBox="0 0 80 80"
      fill="none"
      className="relative z-10"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <motion.circle
        cx="40"
        cy="40"
        r="36"
        stroke="hsl(140 100% 50%)"
        strokeWidth="4"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />
      <motion.path
        d="M24 42 L34 52 L56 30"
        stroke="hsl(140 100% 50%)"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.0, delay: 1.2, ease: "easeOut" }}
      />
      {/* Shimmer across tick */}
      <motion.rect
        x="-10"
        y="0"
        width="20"
        height="80"
        fill="url(#shimmer)"
        initial={{ x: -20 }}
        animate={{ x: 100 }}
        transition={{ duration: 0.6, delay: 2.5, ease: "easeInOut" }}
      />
      <defs>
        <linearGradient id="shimmer" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="white" stopOpacity="0" />
          <stop offset="50%" stopColor="white" stopOpacity="0.3" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </motion.svg>
  </div>
);

/* ── Phrase cycler ── */
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

interface CreationLoadingOverlayProps {
  open: boolean;
  onComplete: () => void;
}

const CreationLoadingOverlay = ({ open, onComplete }: CreationLoadingOverlayProps) => {
  const [phase, setPhase] = useState<"loading" | "success" | "exiting">("loading");
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setPhase("loading");
      setPhraseIndex(0);
      setVisible(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open || phase !== "loading") return;
    const interval = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % PHRASES.length);
    }, PHRASE_INTERVAL);
    return () => clearInterval(interval);
  }, [open, phase]);

  useEffect(() => {
    if (!open || phase !== "loading") return;
    const t = setTimeout(() => setPhase("success"), LOADING_DURATION);
    return () => clearTimeout(t);
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
          transition={{ duration: 0.65, ease: [0, 0, 0.2, 1] }}
        >
          <AnimatePresence mode="wait">
            {phase === "loading" && (
              <motion.div
                key="loading"
                className="flex flex-col items-center gap-8"
                initial={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Spinner />
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
                className="flex flex-col items-center gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                <GreenTick />
                <motion.p
                  className="text-center text-2xl font-extrabold lowercase text-white"
                  initial={{ opacity: 0, y: 15, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.5, delay: 2.0, ease: [0.34, 1.56, 0.64, 1] }}
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

export default CreationLoadingOverlay;
