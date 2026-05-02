import { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

const NEON_BLUE = "hsl(var(--neon-green))";
const PURE_WHITE = "hsl(var(--foreground))";

const IntroDots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="rounded-full transition-all duration-200"
        style={{
          width: i === current ? 10 : 8,
          height: i === current ? 10 : 8,
          background: i === current ? NEON_BLUE : PURE_WHITE,
        }}
      />
    ))}
  </div>
);

const IntroNavArrow = ({
  direction, onClick, onLongPress, onLongPressEnd, disabled,
}: {
  direction: "left" | "right"; onClick: () => void; onLongPress?: () => void; onLongPressEnd?: () => void; disabled?: boolean;
}) => (
  <button
    onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
    onPointerDown={(e) => {
      e.stopPropagation();
      if (!disabled) onLongPress?.();
    }}
    onPointerUp={(e) => {
      e.stopPropagation();
      onLongPressEnd?.();
    }}
    onPointerLeave={(e) => {
      e.stopPropagation();
      onLongPressEnd?.();
    }}
    className="flex h-14 w-14 items-center justify-center active:scale-[1.05]"
    style={{
      backgroundColor: direction === "right" ? NEON_BLUE : "transparent",
      border: direction === "left" ? `5px solid ${PURE_WHITE}` : `5px solid ${NEON_BLUE}`,
      borderRadius: 10, outline: "none", padding: 0,
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.3 : 1,
      transition: "transform 0.05s, opacity 0.2s",
    }}
  >
    {direction === "left" ? (
      <ArrowLeft size={22} strokeWidth={2.75} style={{ color: PURE_WHITE }} />
    ) : (
      <ArrowRight size={22} strokeWidth={2.5} style={{ color: "#000000" }} />
    )}
  </button>
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

  useEffect(() => {
    if (prevOpenRef.current && !open && visible && !shattering) {
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
    if (onExited) onExited();
  }, [onExited]);

  const advance = useCallback(() => {
    setStep((s) => {
      if (s >= totalSteps - 1) {
        return s;
      }
      return s + 1;
    });
  }, [totalSteps]);
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

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence onExitComplete={handleShatterDone}>
      {visible && !shattering ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col bg-black cursor-pointer"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeInOut" }}
          onClick={() => advance()}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
            {/* Standardized layout: centered content -> red 22vh spacer -> arrows row -> dots */}
            <div className="flex-1 flex flex-col overflow-hidden min-h-0">
              {/* Centered content */}
              <div className="flex-1 flex justify-center px-8 min-h-0 overflow-hidden">
                <div className="mx-auto flex w-full max-w-xs flex-col items-center justify-center" style={{ paddingTop: 120, paddingBottom: 0 }}>
                  <div className="grid w-full">
                    <AnimatePresence mode="sync" initial={false}>
                      <motion.div
                        key={step}
                        className="w-full [grid-area:1/1]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.45, ease: "easeInOut" }}
                      >
                        {children(step)}
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Red spacer rectangle */}
              <div
                style={{
                  width: "100%",
                  height: "clamp(38px, 6svh, 56px)",
                  background: "#000000",
                  flexShrink: 0,
                  pointerEvents: "none",
                }}
              />

              {/* Arrows row + dots — always rendered for consistent spacing */}
              <div
                className="flex flex-col items-center"
                style={{
                  flexShrink: 0,
                  paddingBottom: "max(env(safe-area-inset-bottom, 0px), 2%)",
                }}
              >
                {showNav ? (
                  <>
                    <div className="mb-4 flex h-14 items-center gap-4">
                      <div style={{ visibility: step === 0 ? "hidden" : "visible" }}>
                        <NavArrow direction="left" onClick={goBack} disabled={step === 0} />
                      </div>
                      <div style={{ visibility: isLastStep && !reserveLastStepNavSpace ? "hidden" : "visible" }}>
                        <NavArrow
                          direction="right"
                          onClick={advance}
                          disabled={false}
                          onLongPress={startLongPress}
                          onLongPressEnd={stopSkip}
                        />
                      </div>
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
                ) : totalSteps > 1 ? (
                  <div className="flex h-3 items-center">
                    <Dots current={step} total={totalSteps} />
                  </div>
                ) : null}
                <div style={{ height: 24, pointerEvents: "none" }} />
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>,
    document.body,
  );
};

export default OverlayShell;
