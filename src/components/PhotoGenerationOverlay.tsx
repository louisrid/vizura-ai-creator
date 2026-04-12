import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import ProgressBarLoader from "@/components/loading/ProgressBarLoader";

interface PhotoGenerationOverlayProps {
  open: boolean;
  phase: "loading" | "success";
  phrases: string[];
  resultImageUrl: string | null;
}

const OVERLAY_FADE_DURATION = 0.55;

const PhotoGenerationOverlay = ({ open, phase, phrases, resultImageUrl }: PhotoGenerationOverlayProps) => {
  const [loadingDone, setLoadingDone] = useState(false);
  const [showingLoader, setShowingLoader] = useState(true);
  const [dismissing, setDismissing] = useState(false);
  const loadingKeyRef = useRef(0);

  useEffect(() => {
    if (!open) {
      setLoadingDone(false);
      setShowingLoader(true);
      setDismissing(false);
      loadingKeyRef.current += 1;
    }
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

  // When phase=success, let the bar accelerate to 100% via completeNow
  // loadingDone will be set by the bar's onComplete callback

  if (!open) return null;

  const showSuccess = phase === "success" && loadingDone && !showingLoader && !dismissing;

  const dismissOverlay = () => {
    setDismissing(true);
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent("photo-overlay-dismiss"));
    }, 550);
  };

  return createPortal(
    <AnimatePresence mode="wait">
      {dismissing ? (
        <motion.div
          key="photo-dismissing"
          className="fixed inset-0 z-[9999] bg-black"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        />
      ) : !showSuccess ? (
        <motion.div
          key={`photo-loading-${loadingKeyRef.current}`}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center px-6 bg-black"
          style={{ overflow: "hidden", touchAction: "none", overscrollBehavior: "none" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          <ProgressBarLoader
            duration={25000}
            phrases={phrases}
            phraseInterval={5200}
            completeNow={phase === "success"}
            onComplete={() => {
              setLoadingDone(true);
              // Brief delay for the bar to sit at 100%, then fade to success
              setTimeout(() => setShowingLoader(false), 400);
            }}
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
          style={{ touchAction: "manipulation", cursor: "pointer" }}
        >
          <div className="relative z-10 flex w-full max-w-xs md:max-w-md flex-col items-center gap-1.5">
            <motion.p
              className="text-center text-[2.2rem] font-[900] lowercase text-white mt-1"
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.34, delay: 0.18, ease: [0.34, 1.56, 0.64, 1] }}
            >
              image created!
            </motion.p>

            {resultImageUrl && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4, delay: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
                className="rounded-[10px] border-2 border-[rgba(255,255,255,0.15)] overflow-hidden mt-0.5" style={{ backgroundColor: "#1a1a1a" }}
              >
                <img src={resultImageUrl} alt="generated" className="w-[20rem] md:w-[28rem] h-auto object-contain" />
              </motion.div>
            )}

            <motion.p
              className="text-xs font-[700] lowercase text-white/40 mt-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, y: [0, -4, 0] }}
              transition={{ opacity: { duration: 0.4, delay: 0.9 }, y: { duration: 1.8, repeat: Infinity, ease: "easeInOut", delay: 1.2 } }}
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
