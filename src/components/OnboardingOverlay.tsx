import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Camera, RefreshCw, Sparkles, SlidersHorizontal, PenLine } from "lucide-react";

const TOTAL_STEPS = 7;


/* ── palette ── */
const dotColors = [
  "hsl(270 90% 62%)", // purple
  "hsl(200 100% 55%)", // blue
  "hsl(330 95% 58%)", // pink
  "hsl(165 90% 45%)", // green
  "hsl(240 85% 65%)", // indigo
  "hsl(285 80% 60%)", // violet
  "hsl(195 95% 50%)", // cyan
];

const amber = "#d4a843";

/* ── progress dots — active = light blue gradient ── */
const ProgressDots = ({ current }: { current: number }) => (
  <div className="flex items-center justify-center gap-3 pt-2 pb-1">
    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
      <motion.div
        key={i}
        className="rounded-full"
        style={i === current ? { background: "linear-gradient(135deg, hsl(200 100% 65%), hsl(220 100% 55%))" } : {}}
        initial={false}
        animate={{
          width: i === current ? 32 : 10,
          height: 10,
          ...(i !== current ? { backgroundColor: "hsl(0 0% 100% / 0.15)" } : {}),
        }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
      />
    ))}
  </div>
);

/* ── numbered circle step ── */
const StepCircle = ({ n, delay = 0 }: { n: number; delay?: number }) => (
  <motion.div
    className="flex h-11 w-11 items-center justify-center rounded-full text-base font-[900]"
    style={{ background: dotColors[(n - 1) % dotColors.length], color: "#000" }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 1, scale: [0, 1.25, 0.9, 1] }}
    transition={{ duration: 0.4, delay, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <motion.span
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 2, delay: delay + 0.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {n}
    </motion.span>
  </motion.div>
);

/* ── typing line ── */
const TypingLine = ({ text, delay = 0.5 }: { text: string; delay?: number }) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let idx = 0;
    const t = window.setTimeout(() => {
      const iv = window.setInterval(() => {
        idx++;
        setDisplayed(text.slice(0, idx));
        if (idx >= text.length) clearInterval(iv);
      }, 36);
      return () => clearInterval(iv);
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [text, delay]);
  return (
    <span className="text-sm font-bold lowercase" style={{ color: "hsl(0 0% 100% / 0.78)" }}>
      {displayed}
      <motion.span
        className="ml-0.5 inline-block h-4 w-[2px] align-middle"
        style={{ background: "hsl(0 0% 100% / 0.4)" }}
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.55, repeat: Infinity }}
      />
    </span>
  );
};

/* ── particle burst on final tap ── */
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

/* ── big bold title ── */
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
    className="max-w-[17rem] text-center text-sm font-bold lowercase leading-snug"
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

/* ── photo card for screen 5 ── */
const PhotoCard = ({ delay, rotate }: { delay: number; rotate: number }) => (
  <motion.div
    className="rounded-2xl border-[4px]"
    style={{
      borderColor: "hsl(0 0% 100% / 0.1)",
      background: "hsl(0 0% 100% / 0.06)",
      width: 80,
      height: 112,
    }}
    initial={{ opacity: 0, y: 40, rotate: rotate * 0.5, scale: 0.8 }}
    animate={{ opacity: 1, y: 0, rotate, scale: 1 }}
    transition={{ duration: 0.4, delay, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <motion.div
      className="h-full w-full rounded-xl"
      style={{ background: "linear-gradient(135deg, hsl(270 60% 30% / 0.4), hsl(200 60% 30% / 0.3))" }}
      animate={{ rotate: [rotate, rotate + 1, rotate - 0.5, rotate] }}
      transition={{ duration: 3, delay: delay + 0.5, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

/* ── control row item for screen 3 ── */
const ControlItem = ({ label, desc, n, delay }: { label: string; desc: string; n: number; delay: number }) => (
  <motion.div
    className="flex items-center gap-3"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3, delay, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-[900]"
      style={{ background: dotColors[(n - 1) % dotColors.length], color: "#000" }}
    >
      {n}
    </div>
    <div>
      <span className="text-sm font-[800] lowercase" style={{ color: "hsl(0 0% 100% / 0.9)" }}>
        {label}
      </span>
      <span className="ml-1.5 text-xs font-bold lowercase" style={{ color: "hsl(0 0% 100% / 0.6)" }}>
        — {desc}
      </span>
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════
   SCENES
   ═══════════════════════════════════════════════════════ */

const Scene0 = () => (
  <div className="flex flex-col items-center gap-5">
    <IconPop delay={0.15} size={96}>
      <span className="text-[5rem]">👋</span>
    </IconPop>
    <BigTitle delay={0.25}>vizura how-to</BigTitle>
    <Subtitle delay={0.4}>quick walkthrough so you instantly get how character creation works</Subtitle>
  </div>
);

const Scene1 = () => (
  <div className="flex flex-col items-center gap-5">
    <IconPop delay={0.1} size={96}>
      <Sparkles size={60} strokeWidth={2} style={{ color: dotColors[2] }} />
    </IconPop>
    <BigTitle delay={0.2}>make any character you want</BigTitle>
    <Subtitle delay={0.35}>start with a vibe, a face, a mood, or a whole fantasy and build from there</Subtitle>
    <motion.div
      className="flex gap-3 pt-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.5 }}
    >
      {["🫶", "✨", "🎨"].map((e, i) => (
        <motion.span
          key={i}
          className="text-4xl"
          initial={{ opacity: 0, y: 16, scale: 0 }}
          animate={{ opacity: 1, y: 0, scale: [0, 1.3, 0.9, 1] }}
          transition={{ duration: 0.35, delay: 0.55 + i * 0.1, ease: [0.2, 0.9, 0.2, 1] }}
        >
          <motion.span
            className="inline-block"
            animate={{ y: [0, -5, 0], rotate: [0, 6, -4, 0] }}
            transition={{ duration: 2.2, delay: 1.2 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}
          >
            {e}
          </motion.span>
        </motion.span>
      ))}
    </motion.div>
  </div>
);

const Scene2 = () => (
  <div className="flex flex-col items-center gap-5">
    <IconPop delay={0.1} size={80}>
      <SlidersHorizontal size={48} strokeWidth={2} style={{ color: dotColors[3] }} />
    </IconPop>
    <BigTitle delay={0.2}>shape their look</BigTitle>
    <Subtitle delay={0.35}>use the controls to fine-tune every detail</Subtitle>
    <div className="mt-1 flex w-full max-w-[17rem] flex-col gap-2.5">
      <ControlItem label="hair colour" desc="pick any shade" n={1} delay={0.5} />
      <ControlItem label="eye colour" desc="set the vibe" n={2} delay={0.6} />
      <ControlItem label="body type" desc="choose the build" n={3} delay={0.7} />
      <ControlItem label="extra details" desc="add anything else" n={4} delay={0.8} />
    </div>
  </div>
);

const Scene3 = () => (
  <div className="flex flex-col items-center gap-5">
    <motion.div
      initial={{ opacity: 0, scale: 0, rotate: -180 }}
      animate={{ opacity: 1, scale: [0, 1.3, 0.9, 1], rotate: 0 }}
      transition={{ duration: 0.5, delay: 0.15, ease: [0.2, 0.9, 0.2, 1] }}
    >
      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 2.5, delay: 0.8, repeat: Infinity, ease: "linear" }}
      >
        <RefreshCw size={56} strokeWidth={2.5} style={{ color: dotColors[0] }} />
      </motion.div>
    </motion.div>
    <BigTitle delay={0.25}>not perfect?</BigTitle>
    <Subtitle delay={0.4}>regenerate anytime — each attempt costs one credit and gives fresh results</Subtitle>
    <StepCircle n={1} delay={0.55} />
  </div>
);

const Scene4 = () => (
  <div className="flex flex-col items-center gap-5">
    <IconPop delay={0.1} size={88}>
      <Camera size={52} strokeWidth={2} style={{ color: dotColors[1] }} />
    </IconPop>
    <BigTitle delay={0.2}>now create photos of them</BigTitle>
    <Subtitle delay={0.35}>polished image sets with depth, variation, and style</Subtitle>
    <motion.div
      className="flex items-end justify-center gap-3 pt-2"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.45 }}
    >
      <PhotoCard delay={0.5} rotate={-8} />
      <PhotoCard delay={0.6} rotate={0} />
      <PhotoCard delay={0.7} rotate={8} />
    </motion.div>
  </div>
);

const Scene5 = () => (
  <div className="flex flex-col items-center gap-5">
    <IconPop delay={0.1} size={80}>
      <PenLine size={48} strokeWidth={2} style={{ color: dotColors[5] }} />
    </IconPop>
    <BigTitle delay={0.2}>describe what you want</BigTitle>
    <Subtitle delay={0.35}>add details like lighting, pose, setting, outfit, or mood</Subtitle>
    <motion.div
      className="mt-1 w-full max-w-[17rem] rounded-2xl border-[4px] px-4 py-3"
      style={{ borderColor: "hsl(0 0% 100% / 0.1)", background: "hsl(0 0% 100% / 0.04)" }}
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.5, ease: [0.2, 0.9, 0.2, 1] }}
    >
      <div className="mb-2 text-[10px] font-extrabold uppercase tracking-wider" style={{ color: "hsl(0 0% 100% / 0.45)" }}>
        prompt
      </div>
      <TypingLine text="sitting in a cafe, golden hour lighting" delay={0.8} />
    </motion.div>
  </div>
);

const Scene6 = ({ burst }: { burst: boolean }) => (
  <div className="relative flex flex-col items-center gap-5">
    <ParticleBurst active={burst} />
    <IconPop delay={0.1} size={96}>
      <span className="text-[5rem]">🚀</span>
    </IconPop>
    <BigTitle delay={0.2}>ready to create?</BigTitle>
    <Subtitle delay={0.35}>sign up free and jump straight into your first character</Subtitle>
  </div>
);

/* ═══════════════════════════════════════════════════════
   MAIN OVERLAY
   ═══════════════════════════════════════════════════════ */

const OnboardingOverlay = ({ open, onDismiss }: { open: boolean; onDismiss: () => void }) => {
  const [step, setStep] = useState(0);
  const [burst, setBurst] = useState(false);
  const [mounted, setMounted] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const advance = useCallback(() => {
    setStep((s) => (s < TOTAL_STEPS - 1 ? s + 1 : s));
  }, []);

  useEffect(() => { setMounted(true); }, []);

  /* lock scroll & reset */
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

  /* swipe handling */
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

  const handleLetsGo = () => {
    setBurst(true);
    window.setTimeout(onDismiss, 700);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ background: "hsl(0 0% 0% / 0.97)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* content */}
          <motion.div
            className="relative z-10 mx-4 flex w-full max-w-sm flex-col items-center"
            initial={{ y: 10, opacity: 0.95 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* scene area */}
            <div className="flex w-full items-center justify-center px-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  className="w-full"
                  initial={{ opacity: 0, x: 30, scale: 0.97 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -30, scale: 0.97 }}
                  transition={{ duration: 0.22, ease: [0.2, 0.9, 0.2, 1] }}
                >
                  {step === 0 && <Scene0 />}
                  {step === 1 && <Scene1 />}
                  {step === 2 && <Scene2 />}
                  {step === 3 && <Scene3 />}
                  {step === 4 && <Scene4 />}
                  {step === 5 && <Scene5 />}
                  {step === 6 && <Scene6 burst={burst} />}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* controls */}
            <div className="mt-6 flex w-full flex-col items-center gap-4">
              {step === TOTAL_STEPS - 1 ? (
                <motion.button
                  onClick={(e) => { e.stopPropagation(); handleLetsGo(); }}
                  className="relative h-14 w-full overflow-hidden rounded-2xl text-sm font-[900] lowercase tracking-tight"
                  style={{ background: amber, color: "#000" }}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.15 }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    animate={{
                      boxShadow: [
                        `0 0 0 0 ${amber}44`,
                        `0 0 0 14px ${amber}00`,
                        `0 0 0 0 ${amber}00`,
                      ],
                    }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                  <span className="relative z-10">let's go</span>
                </motion.button>
              ) : (
                <div className="flex items-center justify-center gap-4">
                  {step > 0 && (
                    <motion.button
                      onClick={(e) => { e.stopPropagation(); setStep((s) => s - 1); }}
                      className="flex h-14 w-14 items-center justify-center rounded-2xl"
                      style={{ background: "#000", border: "2px solid hsl(0 0% 100% / 0.12)", cursor: "pointer" }}
                      whileTap={{ scale: 0.9 }}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ArrowLeft size={22} strokeWidth={2.5} style={{ color: "#fff" }} />
                    </motion.button>
                  )}
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); advance(); }}
                    className="flex h-14 w-14 items-center justify-center rounded-2xl"
                    style={{ background: "#000", border: "2px solid hsl(0 0% 100% / 0.12)", cursor: "pointer" }}
                    whileTap={{ scale: 0.9 }}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.25, delay: 0.1 }}
                    layout
                  >
                    <ArrowRight size={24} strokeWidth={2.5} style={{ color: "#fff" }} />
                  </motion.button>
                </div>
              )}

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
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default OnboardingOverlay;
