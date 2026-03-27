import { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ProgressDots, SwipeHint, ArrowButton } from "./OverlayPrimitives";

interface OverlayShellProps {
  open: boolean;
  totalSteps: number;
  children: (step: number) => React.ReactNode;
  /** Whether to show nav arrows + swipe hint on non-final steps */
  showNav?: boolean;
  /** Called when overlay finishes exit */
  onExited?: () => void;
}

const OverlayShell = ({ open, totalSteps, children, showNav = true, onExited }: OverlayShellProps) => {
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const advance = useCallback(() => {
    setStep((s) => (s < totalSteps - 1 ? s + 1 : s));
  }, [totalSteps]);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    setStep(0);

    const root = document.getElementById("root");
    const prev = {
      body: document.body.style.overflow,
      html: document.documentElement.style.overflow,
      root: root?.style.overflow ?? "",
      touch: root?.style.touchAction ?? "",
    };
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (root) { root.style.overflow = "hidden"; root.style.touchAction = "none"; }
    return () => {
      document.body.style.overflow = prev.body;
      document.documentElement.style.overflow = prev.html;
      if (root) { root.style.overflow = prev.root; root.style.touchAction = prev.touch; }
    };
  }, [open]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50 && step < totalSteps - 1) advance();
    if (diff < -50 && step > 0) setStep((s) => s - 1);
    touchStartX.current = null;
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence onExitComplete={onExited}>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{ background: "hsl(0 0% 0% / 0.97)", transformOrigin: "center center" }}
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1, transition: { duration: 0.12, ease: "easeOut" } }}
          exit={{ opacity: 0, transition: { duration: 0.5, ease: "easeIn" } }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div className="flex-1 flex items-center justify-center overflow-hidden px-5">
            <div className="flex w-full max-w-sm items-center justify-center" style={{ marginTop: "8vh" }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  className="w-full"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.22, ease: [0.2, 0.9, 0.2, 1] }}
                >
                  {children(step)}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          <div className="mx-auto flex w-full max-w-sm shrink-0 flex-col items-center gap-2 px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-1">
            {showNav && step !== totalSteps - 1 ? (
              <div className="flex items-center justify-center gap-3">
                {step > 0 && <ArrowButton direction="left" onClick={() => setStep((s) => s - 1)} />}
                <ArrowButton direction="right" onClick={advance} />
              </div>
            ) : null}

            {showNav && step < totalSteps - 1 && <SwipeHint />}

            <ProgressDots current={step} total={totalSteps} />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default OverlayShell;
