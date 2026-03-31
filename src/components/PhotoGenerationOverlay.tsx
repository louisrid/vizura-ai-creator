import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import PremiumRipple from "@/components/loading/PremiumRipple";

interface PhotoGenerationOverlayProps {
  open: boolean;
  phase: "loading" | "success";
  phrases: string[];
  resultImageUrl: string | null;
}

const PhotoGenerationOverlay = ({ open, phase, phrases, resultImageUrl }: PhotoGenerationOverlayProps) => {
  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setPhraseIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open || phase !== "loading") return;
    const interval = window.setInterval(() => {
      setPhraseIndex((current) => (current + 1) % phrases.length);
    }, 1500);

    return () => window.clearInterval(interval);
  }, [open, phase, phrases]);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  if (!open) return null;

  return createPortal(
    <AnimatePresence mode="wait">
      {phase === "loading" ? (
        <motion.div
          key="photo-loading"
          className="fixed inset-0 z-[9999] flex items-center justify-center px-6 bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <div className="flex flex-col items-center gap-8">
            <PremiumRipple />
            <div className="flex h-8 items-center">
              <AnimatePresence mode="wait">
                <motion.p
                  key={phrases[phraseIndex]}
                  className="text-center text-base font-extrabold lowercase text-white"
                  initial={{ opacity: 0, y: 12, scale: 0.94 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.22, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  {phrases[phraseIndex]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          key="photo-success"
          className="fixed inset-0 z-[9999] flex items-center justify-center px-6 bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div className="flex w-full max-w-xs flex-col items-center gap-6">
            <motion.p
              className="text-center text-[2rem] font-extrabold lowercase text-white"
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.34, delay: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
            >
              image created!
            </motion.p>
            <motion.p
              className="text-center text-sm font-extrabold lowercase text-white/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.5 }}
            >
              find it in your storage
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default PhotoGenerationOverlay;
