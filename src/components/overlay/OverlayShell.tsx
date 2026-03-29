import { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { IntroDots, IntroNavArrow } from "./IntroSequencePrimitives";

const Dots = IntroDots;
const NavArrow = IntroNavArrow;

interface OverlayShellProps {
  open: boolean;
  totalSteps: number;
  children: (step: number) => React.ReactNode;
  showNav?: boolean;
  onExited?: () => void;
  onSkip?: () => void;
  reserveLastStepNavSpace?: boolean;
}

const OverlayShell = ({ open, totalSteps, children, showNav = true, onExited, reserveLastStepNavSpace = true }: OverlayShellProps) => {
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const skipTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = useCallback(() => setStep((s) => Math.min(s + 1, totalSteps - 1)), [totalSteps]);
  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const stopSkip = useCallback(() => {
    if (skipTimerRef.current) {
      clearTimeout(skipTimerRef.current as unknown as ReturnType<typeof setTimeout>);
      clearInterval(skipTimerRef.current);
      skipTimerRef.current = null;
    }
    setSkipping(false);
  }, []);

  const startLongPress = useCallback(() => {
    if (skipTimerRef.current) return;
    setSkipping(true);
    skipTimerRef.current = setInterval(() => {
      setStep((s) => {
        if (s >= totalSteps - 1) {
          if (skipTimerRef.current) clearInterval(skipTimerRef.current);
          skipTimerRef.current = null;
          return s;
        }
        return s + 1;
      });
    }, 180);
  }, [totalSteps]);

  useEffect(() => {
    return () => stopSkip();
  }, [stopSkip]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setSkipping(false);
    stopSkip();
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
  }, [open, stopSkip]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (diff > 50 && step < totalSteps - 1) advance();
    if (diff < -50 && step > 0) goBack();
    touchStartX.current = null;
  };

  const isLastStep = step === totalSteps - 1;

  // During skip: instant transitions. Normal: smooth.
  const contentTransition = skipping
    ? { duration: 0.08, ease: "linear" as const }
    : { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence onExitComplete={onExited}>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col bg-black cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => {
            if (!isLastStep) advance();
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Two-zone layout: content zone (top) + nav zone (bottom), no overlap */}
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Content zone — vertically centred in its area */}
            <div className="flex flex-1 items-center justify-center px-8" style={{ maxHeight: "62%" }}>
              <div className="mx-auto flex w-full max-w-xs flex-col items-center">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={step}
                    className="w-full"
                    initial={{ opacity: 0, y: skipping ? 0 : 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: skipping ? 0 : -12 }}
                    transition={contentTransition}
                  >
                    {children(step)}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Nav zone — fixed height area below content */}
            <div className="flex flex-col items-center justify-start pt-4 pb-8" style={{ height: "38%" }}>
              {showNav && (
                <>
                  <div className={`mb-4 flex h-14 items-center gap-4 ${isLastStep && !reserveLastStepNavSpace ? "invisible" : "visible"}`}>
                    <NavArrow direction="left" onClick={goBack} disabled={step === 0 || isLastStep} />
                    <NavArrow
                      direction="right"
                      onClick={advance}
                      disabled={isLastStep}
                      onLongPress={startLongPress}
                    />
                  </div>
                  <div className="flex h-3 items-center">
                    <Dots current={step} total={totalSteps} />
                  </div>
                </>
              )}

              {!showNav && totalSteps > 1 && (
                <div className="flex h-3 items-center">
                  <Dots current={step} total={totalSteps} />
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default OverlayShell;
