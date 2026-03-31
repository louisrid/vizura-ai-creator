import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import PremiumRipple from "@/components/loading/PremiumRipple";
import SuccessRing from "@/components/loading/SuccessRing";

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
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[9999] flex items-center justify-center bg-black px-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      >
        {phase === "loading" ? (
          <motion.div
            key="photo-loading"
            className="flex flex-col items-center gap-8"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
          >
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
          </motion.div>
        ) : (
          <motion.div
            key="photo-success"
            className="flex w-full max-w-xs flex-col items-center gap-6"
            initial={{ opacity: 0.98 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <SuccessRing size={88} />
            <motion.div
              className="flex aspect-[10/11] w-full items-center justify-center overflow-hidden rounded-[2rem] border-[5px] border-border bg-card"
              initial={{ opacity: 0, y: 18, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.36, delay: 0.06, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {resultImageUrl ? (
                <img src={resultImageUrl} alt="generated image" className="h-full w-full object-cover" />
              ) : null}
            </motion.div>
            <motion.p
              className="text-center text-[2rem] font-extrabold lowercase text-white"
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.34, delay: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
            >
              image created!
            </motion.p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
};

export default PhotoGenerationOverlay;