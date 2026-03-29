import { useCallback, useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

const NAV_GREY = "hsl(0 0% 45%)";
const NAV_GREY_DIM = "hsl(0 0% 25%)";

/* ── dots matching IntroSequence exactly ── */
const Dots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="rounded-full transition-all duration-200"
        style={{
          width: i === current ? 10 : 8,
          height: i === current ? 10 : 8,
          background: i === current ? NAV_GREY : NAV_GREY_DIM,
        }}
      />
    ))}
  </div>
);

/* ── arrow matching IntroSequence exactly ── */
const NavArrow = ({ direction, onClick, disabled }: { direction: "left" | "right"; onClick: () => void; disabled?: boolean }) => (
  <button
    onClick={(e) => { e.stopPropagation(); if (!disabled) onClick(); }}
    className="flex h-14 w-14 items-center justify-center active:scale-[1.05]"
    style={{
      backgroundColor: direction === "right" ? NAV_GREY : "transparent",
      border: direction === "right" ? `5px solid ${NAV_GREY}` : "none",
      boxShadow: direction === "left" ? `inset 0 0 0 5px ${NAV_GREY}` : "none",
      opacity: disabled ? 0.3 : 1,
      borderRadius: 16,
      outline: "none",
      cursor: disabled ? "default" : "pointer",
      transition: "transform 0.05s",
    }}
  >
    {direction === "left" ? (
      <ArrowLeft size={22} strokeWidth={2.75} color={NAV_GREY} />
    ) : (
      <ArrowRight size={22} strokeWidth={2.5} style={{ color: "#000" }} />
    )}
  </button>
);

interface OverlayShellProps {
  open: boolean;
  totalSteps: number;
  children: (step: number) => React.ReactNode;
  showNav?: boolean;
  onExited?: () => void;
  onSkip?: () => void;
}

const OverlayShell = ({ open, totalSteps, children, showNav = true, onExited }: OverlayShellProps) => {
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const advance = useCallback(() => setStep((s) => Math.min(s + 1, totalSteps - 1)), [totalSteps]);
  const goBack = useCallback(() => setStep((s) => Math.max(s - 1, 0)), []);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    setStep(0);
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

  const handleTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
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
    <AnimatePresence onExitComplete={onExited}>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col bg-black cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={() => { if (!isLastStep) advance(); }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Content — same paddingTop as IntroSequence */}
          <div className="flex-1 px-8 overflow-hidden flex flex-col" style={{ paddingTop: "34vh" }}>
            <div className="w-full max-w-xs mx-auto flex flex-col items-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  className="w-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  {children(step)}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Arrows + dots — tight below content, matching IntroSequence */}
            {showNav && (
              <div className="flex flex-col items-center mt-8">
                {!isLastStep && (
                  <div className="flex items-center gap-4 mb-4">
                    <NavArrow direction="left" onClick={goBack} disabled={step === 0} />
                    <NavArrow direction="right" onClick={advance} />
                  </div>
                )}
                <Dots current={step} total={totalSteps} />
              </div>
            )}

            {/* Single-step overlays (no nav): just dots */}
            {!showNav && totalSteps > 1 && (
              <div className="flex flex-col items-center mt-8">
                <Dots current={step} total={totalSteps} />
              </div>
            )}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default OverlayShell;
