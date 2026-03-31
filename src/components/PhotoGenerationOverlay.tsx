import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import ProgressBarLoader from "@/components/loading/ProgressBarLoader";

interface PhotoGenerationOverlayProps {
  open: boolean;
  phase: "loading" | "success";
  phrases: string[];
  resultImageUrl: string | null;
}

const RESULT_EMOJIS = ["✨", "🌙", "💫", "🌸", "🦋", "⚡️", "💎", "🌞", "🎨", "🔮"];

const PhotoGenerationOverlay = ({ open, phase, phrases, resultImageUrl }: PhotoGenerationOverlayProps) => {
  const [resultEmoji] = useState(() => RESULT_EMOJIS[Math.floor(Math.random() * RESULT_EMOJIS.length)]);
  const [loadingDone, setLoadingDone] = useState(false);

  useEffect(() => {
    if (!open) setLoadingDone(false);
  }, [open]);

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
      {phase === "loading" && !loadingDone ? (
        <motion.div
          key="photo-loading"
          className="fixed inset-0 z-[9999] flex items-center justify-center px-6 bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          <ProgressBarLoader
            duration={6000}
            phrases={phrases}
            phraseInterval={3500}
            onComplete={() => setLoadingDone(true)}
          />
        </motion.div>
      ) : (
        <motion.div
          key="photo-success"
          className="fixed inset-0 z-[9999] flex items-center justify-center px-6 bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          onClick={(e) => { e.stopPropagation(); }}
        >
          <div
            className="fixed inset-0 z-0"
            onClick={() => {
              // Tap anywhere to dismiss — handled by parent setting phase to hidden
              const event = new CustomEvent("photo-overlay-dismiss");
              window.dispatchEvent(event);
            }}
          />
          <div className="relative z-10 flex w-full max-w-xs flex-col items-center gap-6">
            <motion.p
              className="text-center text-[2rem] font-extrabold lowercase text-white"
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.34, delay: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
            >
              image created!
            </motion.p>

            {/* Emoji preview box — dark charcoal rounded box with emoji */}
            <motion.div
              className="flex items-center justify-center rounded-2xl bg-card border-[5px] border-border"
              style={{ width: 120, height: 140 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            >
              {resultImageUrl ? (
                <img src={resultImageUrl} alt="created" className="h-full w-full rounded-[calc(1rem-5px)] object-cover" />
              ) : (
                <span className="text-4xl">{resultEmoji}</span>
              )}
            </motion.div>

            <motion.p
              className="text-center text-sm font-extrabold lowercase text-white/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.7 }}
            >
              tap to continue
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default PhotoGenerationOverlay;
