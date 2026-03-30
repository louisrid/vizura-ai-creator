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
const LOADING_DURATION = 8000;
const SUCCESS_HOLD = 5000;

const RippleLoader = () => {
  const rings = [0, 1, 2, 3, 4];
  const colors = [
    "hsl(195, 100%, 55%)",
    "hsl(50, 100%, 50%)",
    "hsl(140, 100%, 50%)",
    "hsl(330, 100%, 50%)",
    "hsl(210, 100%, 55%)",
  ];
  return (
    <div className="relative flex items-center justify-center" style={{ width: 120, height: 120 }}>
      {rings.map((i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: 20,
            height: 20,
            border: `2.5px solid ${colors[i % colors.length]}`,
            top: "50%",
            left: "50%",
            marginTop: -10,
            marginLeft: -10,
          }}
          animate={{
            scale: [0, 4, 6],
            opacity: [0.8, 0.4, 0],
            borderColor: [
              colors[i % colors.length],
              colors[(i + 1) % colors.length],
              colors[(i + 2) % colors.length],
            ],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeOut",
          }}
        />
      ))}
      <motion.div
        className="absolute rounded-full"
        style={{ width: 10, height: 10, background: "hsl(195, 100%, 55%)" }}
        animate={{
          scale: [1, 1.3, 1],
          backgroundColor: [
            "hsl(195, 100%, 55%)",
            "hsl(50, 100%, 50%)",
            "hsl(140, 100%, 50%)",
            "hsl(195, 100%, 55%)",
          ],
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
};

const GreenTick = () => (
  <motion.svg
    width="80"
    height="80"
    viewBox="0 0 80 80"
    fill="none"
    initial={{ opacity: 0, scale: 0.6 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
  >
    <motion.circle
      cx="40"
      cy="40"
      r="36"
      stroke="hsl(140, 100%, 50%)"
      strokeWidth="3.5"
      fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 1.5, ease: "easeInOut" }}
    />
    <motion.path
      d="M24 42 L34 52 L56 30"
      stroke="hsl(140, 100%, 50%)"
      strokeWidth="4.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
      initial={{ pathLength: 0, opacity: 0 }}
      animate={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 1.0, delay: 1.4, ease: "easeInOut" }}
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
                  transition={{ duration: 0.5, delay: 1.5, ease: [0.34, 1.56, 0.64, 1] }}
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
