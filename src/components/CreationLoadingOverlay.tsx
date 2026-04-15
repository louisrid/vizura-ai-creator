import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import PremiumRipple from "@/components/loading/PremiumRipple";

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
const SUCCESS_HOLD = 4000;

const PhraseText = ({ phrase }: { phrase: string }) => (
  <motion.p
    key={phrase}
    className="text-center text-base font-extrabold lowercase text-white"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.3, ease: "easeInOut" }}
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
          style={{ overflow: "hidden", touchAction: "none", overscrollBehavior: "none" }}
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
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
                <PremiumRipple />
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
                className="fixed inset-0 flex flex-col items-center justify-center px-6 text-center"
                style={{ backgroundColor: "#34C759" }}
                initial={{ opacity: 1 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0 }}
              >
                <motion.p
                  className="text-center text-[3rem] font-[900] lowercase leading-[1.05] text-black"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.2, ease: "easeInOut" }}
                >
                  <span className="block">character</span>
                  <span className="block">created!</span>
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
