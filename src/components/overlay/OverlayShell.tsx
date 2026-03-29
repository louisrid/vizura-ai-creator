import { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { IntroDots, IntroNavArrow } from "./IntroSequencePrimitives";
import ShatterExit from "../ShatterExit";

/* ── ambient glow background ── */
const AmbientGlow = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden">
    <motion.div
      className="absolute rounded-full blur-[120px]"
      style={{
        width: "70%",
        height: "70%",
        top: "20%",
        left: "15%",
        background: "radial-gradient(circle, hsl(260 80% 30% / 0.15), hsl(220 90% 20% / 0.08), transparent 70%)",
      }}
      animate={{
        x: [0, 40, -30, 0],
        y: [0, -30, 20, 0],
        scale: [1, 1.15, 0.9, 1],
      }}
      transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute rounded-full blur-[100px]"
      style={{
        width: "50%",
        height: "50%",
        bottom: "10%",
        right: "5%",
        background: "radial-gradient(circle, hsl(200 80% 25% / 0.12), hsl(240 70% 20% / 0.06), transparent 70%)",
      }}
      animate={{
        x: [0, -35, 25, 0],
        y: [0, 20, -25, 0],
        scale: [1, 0.85, 1.1, 1],
      }}
      transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
    />
  </div>
);

const Dots = IntroDots;
const NavArrow = IntroNavArrow;

interface OverlayShellProps {
  open: boolean;
  totalSteps: number;
  children: (step: number) => React.ReactNode;
  showNav?: boolean;
  onExited?: () => void;
  onSkip?: () => void;
  onLongPressSkip?: () => void;
  reserveLastStepNavSpace?: boolean;
  bottomContent?: React.ReactNode;
}

const OverlayShell = ({ open, totalSteps, children, showNav = true, onExited, onLongPressSkip, reserveLastStepNavSpace = true, bottomContent }: OverlayShellProps) => {
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [shattering, setShattering] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);

  const triggerExit = useCallback((afterAction?: () => void) => {
    if (shattering) return;
    pendingActionRef.current = afterAction || null;
    setShattering(true);
  }, [shattering]);

  const handleShatterDone = useCallback(() => {
    if (pendingActionRef.current) pendingActionRef.current();
    pendingActionRef.current = null;
    if (onExited) onExited();
  }, [onExited]);

  const advance = useCallback(() => {
    setStep((s) => {
      if (s >= totalSteps - 1) {
        if (onLongPressSkip) setTimeout(() => triggerExit(() => onLongPressSkip()), 0);
        return s;
      }
      return s + 1;
    });
  }, [totalSteps, onLongPressSkip, triggerExit]);
  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  const stopSkip = useCallback(() => {
    if (skipTimerRef.current) {
      clearTimeout(skipTimerRef.current);
      skipTimerRef.current = null;
    }
  }, []);

  const startLongPress = useCallback(() => {
    if (skipTimerRef.current) return;
    skipTimerRef.current = setTimeout(() => {
      skipTimerRef.current = null;
      if (onLongPressSkip) {
        onLongPressSkip();
      } else {
        setStep(totalSteps - 1);
      }
    }, 500);
  }, [totalSteps, onLongPressSkip]);

  useEffect(() => {
    return () => stopSkip();
  }, [stopSkip]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setStep(0);
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

  const contentTransition = { duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const };

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
            advance();
          }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Ambient background glow */}
          <AmbientGlow />
          {/* Absolute layout: content pinned at center, nav pinned below */}
          <div className="relative flex-1 overflow-hidden">
            {/* Content zone — pinned at vertical center of screen */}
            <div className="absolute inset-x-0 flex items-center justify-center px-8" style={{ top: "48%", transform: "translateY(-50%)" }}>
              <div className="mx-auto flex w-full max-w-xs flex-col items-center">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={step}
                    className="w-full"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    {children(step)}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Nav zone — pinned at fixed position */}
            <div className="absolute inset-x-0 flex flex-col items-center" style={{ top: "68%" }}>
              {showNav && (
                <>
                  <div className={`mb-4 flex h-14 items-center gap-4 ${isLastStep && !reserveLastStepNavSpace ? "invisible" : "visible"}`}>
                    <NavArrow direction="left" onClick={goBack} disabled={step === 0} />
                    <NavArrow
                      direction="right"
                      onClick={advance}
                      disabled={false}
                      onLongPress={startLongPress}
                    />
                  </div>
                  <div className="flex h-3 items-center">
                    <Dots current={step} total={totalSteps} />
                  </div>
                  {bottomContent && (
                    <div className="mt-5 flex items-center justify-center">
                      {bottomContent}
                    </div>
                  )}
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
