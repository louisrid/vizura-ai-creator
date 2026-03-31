import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import ProgressBarLoader from "@/components/loading/ProgressBarLoader";

const PHRASES = [
  "mapping your features…",
  "building your look…",
  "training the AI…",
  "final touches…",
];

const SUCCESS_HOLD = 2000;

interface CookingOverlayProps {
  open: boolean;
  onComplete: () => void;
}

const CookingOverlay = ({ open, onComplete }: CookingOverlayProps) => {
  const [phase, setPhase] = useState<"cooking" | "success" | "exiting">("cooking");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setPhase("cooking");
      setVisible(true);
    }
  }, [open]);

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
    <AnimatePresence onExitComplete={handleExitComplete} mode="wait">
      {phase !== "exiting" && (
        <motion.div
          key={phase}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.0, ease: "easeInOut" }}
        >
          {phase === "cooking" && (
            <ProgressBarLoader
              duration={25000}
              phrases={PHRASES}
              phraseInterval={3500}
              onComplete={() => setPhase("success")}
            />
          )}
          {phase === "success" && (
            <div className="flex flex-col items-center justify-center gap-6">
              <motion.span
                className="text-[3rem] inline-block select-none"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.15, ease: [0.34, 1.56, 0.64, 1] }}
              >
                ✅
              </motion.span>
              <motion.p
                className="text-center text-[2rem] font-extrabold lowercase text-white"
                initial={{ opacity: 0, y: 18, scale: 0.86 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.45, delay: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
              >
                character created!
              </motion.p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default CookingOverlay;
