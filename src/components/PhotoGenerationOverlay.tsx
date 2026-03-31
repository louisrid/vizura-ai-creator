import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import ProgressBarLoader from "@/components/loading/ProgressBarLoader";
import EmojiPreviewBox from "@/components/EmojiPreviewBox";
import { extractEmojiFromPosterDataUrl } from "@/lib/demoImages";

interface PhotoGenerationOverlayProps {
  open: boolean;
  phase: "loading" | "success";
  phrases: string[];
  resultImageUrl: string | null;
}

const RESULT_EMOJIS = ["✨", "🌙", "💫", "🌸", "🦋", "⚡️", "💎", "🌞", "🎨", "🔮"];
const OVERLAY_FADE_DURATION = 0.75;

const PhotoGenerationOverlay = ({ open, phase, phrases, resultImageUrl }: PhotoGenerationOverlayProps) => {
  const [fallbackEmoji] = useState(() => RESULT_EMOJIS[Math.floor(Math.random() * RESULT_EMOJIS.length)]);
  const [loadingDone, setLoadingDone] = useState(false);
  const resultEmoji = useMemo(() => extractEmojiFromPosterDataUrl(resultImageUrl) || fallbackEmoji, [resultImageUrl, fallbackEmoji]);

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

  const showSuccess = phase === "success" && loadingDone;
  const dismissOverlay = () => {
    window.dispatchEvent(new CustomEvent("photo-overlay-dismiss"));
  };

  return createPortal(
    <AnimatePresence mode="wait">
      {!showSuccess ? (
        <motion.div
          key="photo-loading"
          className="fixed inset-0 z-[9999] flex items-center justify-center px-6 bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: OVERLAY_FADE_DURATION, ease: "easeInOut" }}
        >
          <ProgressBarLoader
            duration={25000}
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
          transition={{ duration: OVERLAY_FADE_DURATION, ease: "easeInOut" }}
          onPointerDown={dismissOverlay}
          style={{ touchAction: "manipulation" }}
        >
          <div className="relative z-10 flex w-full max-w-xs flex-col items-center gap-6">
            <motion.p
              className="text-center text-[2rem] font-extrabold lowercase text-white"
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.34, delay: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
            >
              image created!
            </motion.p>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
            >
              <EmojiPreviewBox
                emoji={resultEmoji}
                className="h-[13.5rem] w-[13.5rem]"
                emojiClassName="text-[4.5rem]"
              />
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
