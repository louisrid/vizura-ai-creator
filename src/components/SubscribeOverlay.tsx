import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Loader2, Crown, Zap } from "lucide-react";

const TOTAL_STEPS = 3;

const dotColors = [
  "hsl(270 90% 62%)",
  "hsl(210 100% 65%)",
  "hsl(330 95% 58%)",
  "hsl(150 100% 40%)",
  "hsl(240 85% 65%)",
  "hsl(285 80% 60%)",
  "hsl(350 90% 58%)",
];

/* ── progress dots ── */
const ProgressDots = ({ current }: { current: number }) => (
  <div className="flex items-center justify-center gap-2.5 pt-2 pb-1">
    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
      <motion.div
        key={i}
        className="rounded-full"
        style={{
          background:
            i === current
              ? "linear-gradient(135deg, hsl(210 100% 70%), hsl(225 100% 58%))"
              : "hsl(0 0% 100% / 0.15)",
        }}
        animate={{
          width: i === current ? 14 : 10,
          height: i === current ? 14 : 10,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    ))}
  </div>
);

/* ── big title ── */
const BigTitle = ({ children, delay = 0.1 }: { children: React.ReactNode; delay?: number }) => (
  <motion.h2
    className="text-center text-[2rem] font-[900] lowercase leading-[1.1] tracking-tight"
    style={{ color: "hsl(0 0% 100%)" }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay, ease: [0.2, 0.9, 0.2, 1] }}
  >
    {children}
  </motion.h2>
);

/* ── subtitle ── */
const Subtitle = ({ children, delay = 0.2 }: { children: React.ReactNode; delay?: number }) => (
  <motion.p
    className="max-w-[18rem] text-center text-[0.94rem] font-bold lowercase leading-snug"
    style={{ color: "hsl(0 0% 100% / 0.82)" }}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, delay, ease: "easeOut" }}
  >
    {children}
  </motion.p>
);

/* ── icon pop ── */
const IconPop = ({ children, delay = 0.15, size = 56 }: { children: React.ReactNode; delay?: number; size?: number }) => (
  <motion.div
    className="flex items-center justify-center"
    style={{ width: size, height: size }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 1, scale: [0, 1.3, 0.9, 1] }}
    transition={{ duration: 0.4, delay, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <motion.div
      animate={{ y: [0, -4, 0], scale: [1, 1.05, 1] }}
      transition={{ duration: 2.5, delay: delay + 0.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  </motion.div>
);

/* ── particle burst ── */
const ParticleBurst = ({ active }: { active: boolean }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        angle: (i / 18) * Math.PI * 2,
        dist: 50 + ((i * 17) % 60),
        color: dotColors[i % dotColors.length],
      })),
    [],
  );
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ left: "50%", top: "50%", width: 7, height: 7, background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.dist * 1.8,
            y: Math.sin(p.angle) * p.dist * 1.8,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};

/* ═══════════════════════════════════════════
   SCENES
   ═══════════════════════════════════════════ */

const Scene0 = () => (
  <div className="flex flex-col items-center gap-3">
    <IconPop delay={0.15} size={96}>
      <Crown size={64} strokeWidth={2} style={{ color: "hsl(45 100% 60%)" }} />
    </IconPop>
    <BigTitle delay={0.25}>unlock vizura</BigTitle>
    <Subtitle delay={0.4}>create unlimited characters and bring any idea to life</Subtitle>
  </div>
);

const Scene1 = () => (
  <div className="flex flex-col items-center gap-3">
    <IconPop delay={0.1} size={96}>
      <Zap size={60} strokeWidth={2} style={{ color: dotColors[1] }} />
    </IconPop>
    <BigTitle delay={0.2}>your imagination, no limits</BigTitle>
    <Subtitle delay={0.35}>
      full access to every style, setting, and detail. generate as many photos as you want
    </Subtitle>
  </div>
);

const Scene2 = ({ burst, buying, onSubscribe, onDismiss }: { burst: boolean; buying: boolean; onSubscribe: () => void; onDismiss: () => void }) => (
  <div className="relative flex flex-col items-center gap-3">
    <ParticleBurst active={burst} />
    <IconPop delay={0.1} size={96}>
      <span className="text-[5rem]">✨</span>
    </IconPop>
    <BigTitle delay={0.2}>$7 first month</BigTitle>
    <Subtitle delay={0.35}>then $20/month. cancel anytime</Subtitle>
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onSubscribe();
      }}
      disabled={buying}
      className="relative mt-5 h-16 w-full rounded-2xl border-[4px] text-xl font-[900] lowercase tracking-tight disabled:opacity-60"
      style={{
        background: "linear-gradient(135deg, hsl(52 100% 58%) 0%, hsl(50 100% 55%) 70%, hsl(44 95% 52%) 100%)",
        borderColor: "hsl(50 100% 54%)",
        color: "#000",
      }}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <motion.div
        className="absolute inset-0 rounded-xl"
        animate={{
          boxShadow: [
            "0 0 0 0 hsl(52 100% 58% / 0.4)",
            "0 0 0 14px hsl(52 100% 58% / 0)",
            "0 0 0 0 hsl(52 100% 58% / 0)",
          ],
        }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {buying ? <Loader2 className="animate-spin" size={20} /> : "subscribe"}
      </span>
    </motion.button>
    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onDismiss();
      }}
      className="mt-2 text-xs font-extrabold lowercase underline underline-offset-4"
      style={{ color: "hsl(0 0% 100% / 0.4)" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.5 }}
    >
      i'll think about it
    </motion.button>
  </div>
);

/* ═══════════════════════════════════════════
   MAIN OVERLAY
   ═══════════════════════════════════════════ */

interface SubscribeOverlayProps {
  open: boolean;
  onDismiss: () => void;
  onSubscribe: () => Promise<void>;
  buying: boolean;
}

const SubscribeOverlay = ({ open, onDismiss, onSubscribe, buying }: SubscribeOverlayProps) => {
  const [step, setStep] = useState(0);
  const [burst, setBurst] = useState(false);
  const [mounted, setMounted] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const advance = useCallback(() => {
    setStep((s) => (s < TOTAL_STEPS - 1 ? s + 1 : s));
  }, []);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    setStep(0);
    setBurst(false);

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
    if (diff > 50 && step < TOTAL_STEPS - 1) advance();
    if (diff < -50 && step > 0) setStep((s) => s - 1);
    touchStartX.current = null;
  };

  const handleSubscribe = async () => {
    setBurst(true);
    await onSubscribe();
    window.setTimeout(onDismiss, 700);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
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
                  {step === 0 && <Scene0 />}
                  {step === 1 && <Scene1 />}
                  {step === 2 && <Scene2 burst={burst} buying={buying} onSubscribe={handleSubscribe} onDismiss={onDismiss} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Controls */}
          <div className="mx-auto flex w-full max-w-sm shrink-0 flex-col items-center gap-2 px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-1">
            {step !== TOTAL_STEPS - 1 ? (
              <div className="flex items-center justify-center gap-3">
                {step > 0 && (
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); setStep((s) => s - 1); }}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl border-[4px]"
                    style={{ background: "#000", borderColor: "hsl(0 0% 100% / 0.15)" }}
                    whileTap={{ scale: 1.12, background: "linear-gradient(135deg, hsl(210 100% 65%), hsl(230 85% 55%))" }}
                  >
                    <ArrowLeft size={20} strokeWidth={2.5} style={{ color: "#fff" }} />
                  </motion.button>
                )}
                <motion.button
                  onClick={(e) => { e.stopPropagation(); advance(); }}
                  className="flex h-14 w-14 items-center justify-center rounded-2xl border-[4px]"
                  style={{ background: "#000", borderColor: "hsl(0 0% 100% / 0.15)" }}
                  whileTap={{ scale: 1.12, background: "linear-gradient(135deg, hsl(210 100% 65%), hsl(230 85% 55%))" }}
                >
                  <ArrowRight size={20} strokeWidth={2.5} style={{ color: "#fff" }} />
                </motion.button>
              </div>
            ) : null}

            {step < TOTAL_STEPS - 1 && (
              <motion.p
                className="text-[11px] font-bold lowercase"
                style={{ color: "hsl(0 0% 100%)" }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: 0.3 }}
              >
                swipe or tap arrow
              </motion.p>
            )}

            <ProgressDots current={step} />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default SubscribeOverlay;
