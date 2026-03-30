import { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

const NEON_BLUE = "hsl(195 100% 55%)";
const PURE_WHITE = "hsl(0 0% 100%)";

const IntroDots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="rounded-full transition-all duration-200"
        style={{
          width: i === current ? 10 : 8,
          height: i === current ? 10 : 8,
          background: i === current ? LIGHT_BLUE : PURE_WHITE,
        }}
      />
    ))}
  </div>
);

const IntroNavArrow = ({
  direction, onClick, onLongPress, disabled,
}: {
  direction: "left" | "right"; onClick: () => void; onLongPress?: () => void; disabled?: boolean;
}) => (
  <button
    onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
    onPointerDown={onLongPress}
    className="flex h-14 w-14 items-center justify-center active:scale-[1.05]"
    style={{
      backgroundColor: direction === "right" ? LIGHT_BLUE : "transparent",
      border: direction === "right" ? `5px solid ${LIGHT_BLUE}` : "none",
      boxShadow: direction === "left" ? `inset 0 0 0 5px ${PURE_WHITE}` : "none",
      borderRadius: 16, outline: "none", padding: 0,
      cursor: disabled ? "default" : "pointer",
      transition: "transform 0.05s",
    }}
  >
    {direction === "left" ? (
      <ArrowLeft size={22} strokeWidth={2.75} style={{ color: PURE_WHITE }} />
    ) : (
      <ArrowRight size={22} strokeWidth={2.5} style={{ color: "hsl(0 0% 0%)" }} />
    )}
  </button>
);

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
  onDismiss?: () => void;
  reserveLastStepNavSpace?: boolean;
  bottomContent?: React.ReactNode;
}

const OverlayShell = ({ open, totalSteps, children, showNav = true, onExited, onLongPressSkip, onDismiss, reserveLastStepNavSpace = true, bottomContent }: OverlayShellProps) => {
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const [shattering, setShattering] = useState(false);
  const [visible, setVisible] = useState(open);
  const touchStartX = useRef<number | null>(null);
  const skipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingActionRef = useRef<(() => void) | null>(null);
  const prevOpenRef = useRef(open);

  // Track open changes — if closing externally (dismiss), trigger shatter
  useEffect(() => {
    if (prevOpenRef.current && !open && visible && !shattering) {
      // External close (e.g. dismiss) — trigger shatter
      setShattering(true);
    }
    if (open && !prevOpenRef.current) {
      setVisible(true);
    }
    prevOpenRef.current = open;
  }, [open, visible, shattering]);

  const triggerExit = useCallback((afterAction?: () => void) => {
    if (shattering) return;
    pendingActionRef.current = afterAction || null;
    setShattering(true);
  }, [shattering]);

  const handleShatterDone = useCallback(() => {
    if (pendingActionRef.current) pendingActionRef.current();
    pendingActionRef.current = null;
    setVisible(false);
    setShattering(false);
    if (onDismiss && !open) {
      // Already dismissed externally, just clean up
    }
    if (onExited) onExited();
  }, [onExited, onDismiss, open]);

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
        triggerExit(() => onLongPressSkip());
      } else {
        setStep(totalSteps - 1);
      }
    }, 500);
  }, [totalSteps, onLongPressSkip, triggerExit]);

  useEffect(() => {
    return () => stopSkip();
  }, [stopSkip]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open || !visible) return;
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

  const contentTransition = { duration: 0.05, ease: "linear" as const };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence onExitComplete={handleShatterDone}>
      {visible && !shattering ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col bg-black cursor-pointer"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 0.65, ease: [0, 0, 0.2, 1] }}
          onClick={() => advance()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
            <AmbientGlow />
            <div className="relative flex-1 overflow-hidden">
              <div className="absolute inset-x-0 flex items-center justify-center px-8" style={{ top: "48%", transform: "translateY(-50%)" }}>
                <div className="mx-auto flex w-full max-w-xs flex-col items-center">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={step}
                      className="w-full"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.05, ease: "linear" }}
                    >
                      {children(step)}
                    </motion.div>
                  </AnimatePresence>
                </div>
              </div>

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
