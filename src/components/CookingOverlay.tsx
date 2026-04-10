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

const OVERLAY_FADE_DURATION = 0.35;
const SUCCESS_HOLD = 4000;

interface CookingOverlayProps {
  open: boolean;
  onComplete: () => void;
  startPhase?: "cooking" | "success";
}

const CookingOverlay = ({ open, onComplete, startPhase = "cooking" }: CookingOverlayProps) => {
  const [phase, setPhase] = useState<"cooking" | "success" | "exiting">("cooking");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (open) {
      setPhase(startPhase);
      setVisible(true);
    }
  }, [open, startPhase]);

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
          className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center ${phase === "success" ? "bg-member-green" : "bg-black"}`}
          style={{ overflow: "hidden", touchAction: "none", overscrollBehavior: "none" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {phase === "cooking" && (
            <ProgressBarLoader
              duration={25000}
              phrases={PHRASES}
              phraseInterval={5200}
              onComplete={() => setPhase("success")}
            />
          )}
          {phase === "success" && (
            <div className="flex min-h-[18rem] flex-col items-center justify-center px-6 text-center">
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.85 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <p className="text-center text-[3rem] font-[900] lowercase leading-[1.05] text-black">
                  <span className="block">character</span>
                  <span className="block">created!</span>
                </p>
              </motion.div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default CookingOverlay;
