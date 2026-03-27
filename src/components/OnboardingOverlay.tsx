import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ArrowLeft, Camera, RefreshCw, Sparkles, SlidersHorizontal, PenLine } from "lucide-react";

const TOTAL_STEPS = 6;


/* ── palette ── */
const dotColors = [
  "hsl(270 90% 62%)", // purple
  "hsl(210 100% 65%)", // light blue
  "hsl(330 95% 58%)", // pink
  "hsl(150 100% 40%)", // vivid green
  "hsl(240 85% 65%)", // indigo
  "hsl(285 80% 60%)", // violet
  "hsl(350 90% 58%)", // rose
];

const amber = "#d4a843";

/* ── progress dots — active = circular light blue gradient, smooth transition ── */
const ProgressDots = ({ current }: { current: number }) => (
  <div className="flex items-center justify-center gap-2.5 pt-2 pb-1">
    {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
      <motion.div
        key={i}
        className="rounded-full"
        style={{
          background: i === current
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

/* ── photo card for screen 3 ── */
const photoEmojis = ["🌅", "📸", "✨"];
const photoGradients = [
  "linear-gradient(145deg, hsl(270 50% 18%), hsl(320 40% 22%))",
  "linear-gradient(145deg, hsl(210 50% 18%), hsl(250 40% 22%))",
  "linear-gradient(145deg, hsl(340 50% 18%), hsl(20 40% 22%))",
];

const PhotoCard = ({ delay, rotate, index }: { delay: number; rotate: number; index: number }) => (
  <motion.div
    className="rounded-2xl border-[4px] overflow-hidden flex items-center justify-center"
    style={{
      borderColor: "hsl(0 0% 100% / 0.12)",
      background: photoGradients[index % photoGradients.length],
      width: 82,
      height: 116,
      transformOrigin: "bottom center",
    }}
    initial={{ opacity: 0, y: 50, rotate: rotate * 0.5, scale: 0.7 }}
    animate={{ opacity: 1, y: 0, rotate, scale: 1 }}
    transition={{ duration: 0.45, delay, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <motion.span
      className="text-4xl select-none"
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 2.5, delay: delay + 0.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {photoEmojis[index % photoEmojis.length]}
    </motion.span>
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
        {desc}
      </span>
    </div>
  </motion.div>
);

/* ═══════════════════════════════════════════════════════
   SCENES
   ═══════════════════════════════════════════════════════ */

const Scene0 = () => (
  <div className="flex flex-col items-center gap-3">
    <motion.div
      animate={{ rotate: [0, -8, 8, -6, 6, -3, 3, 0] }}
      transition={{ duration: 0.6, delay: 0.3, ease: "easeInOut" }}
    >
      <IconPop delay={0.15} size={96}>
        <span className="text-[5rem]">👋</span>
      </IconPop>
    </motion.div>
    <BigTitle delay={0.25}>welcome</BigTitle>
    <Subtitle delay={0.4}>make characters and photos in a few taps</Subtitle>
  </div>
);

/* ── slot machine reel for traits ── */
const traitSlots = [
  ["👩‍🦰", "👩‍🦱", "👩‍🦳", "👩"],       // hair
  ["🏻", "🏼", "🏽", "🏾", "🏿"],          // skin tone (modifiers shown as blocks)
  ["👗", "👔", "🧥", "👙"],              // style
];
const slotLabels = ["hair", "skin", "style"];

const SlotReel = ({ items, delay, speed = 2.8 }: { items: string[]; delay: number; speed?: number }) => {
  const looped = [...items, ...items, ...items]; // triple for seamless loop
  const itemH = 48;
  const totalH = items.length * itemH;

  return (
    <motion.div
      className="relative overflow-hidden"
      style={{ width: 52, height: itemH }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
    >
      <motion.div
        className="flex flex-col items-center"
        animate={{ y: [0, -totalH] }}
        transition={{ duration: speed, delay: delay + 0.4, repeat: Infinity, ease: "linear" }}
      >
        {looped.map((item, i) => (
          <div key={i} className="flex items-center justify-center" style={{ height: itemH, width: 52 }}>
            <span className="text-3xl">{item}</span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
};

const Scene1 = () => (
  <div className="flex flex-col items-center gap-3">
    <IconPop delay={0.1} size={96}>
      <Sparkles size={60} strokeWidth={2} style={{ color: dotColors[2] }} />
    </IconPop>
    <BigTitle delay={0.2}>1. choose a look</BigTitle>
    <Subtitle delay={0.35}>set age, ethnicity, and style</Subtitle>
    <motion.div
      className="mt-2 flex items-center gap-1 rounded-2xl border-[4px] px-3 py-2"
      style={{ borderColor: "hsl(0 0% 100% / 0.12)", background: "hsl(0 0% 100% / 0.04)" }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.45 }}
    >
      {traitSlots.map((items, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <SlotReel items={items} delay={0.5 + i * 0.15} speed={2.2 + i * 0.6} />
          <span className="text-[9px] font-extrabold uppercase tracking-wider" style={{ color: "hsl(0 0% 100% / 0.3)" }}>
            {slotLabels[i]}
          </span>
        </div>
      ))}
    </motion.div>
  </div>
);

const Scene2 = () => (
  <div className="flex flex-col items-center gap-3">
    <IconPop delay={0.1} size={80}>
      <SlidersHorizontal size={48} strokeWidth={2} style={{ color: dotColors[3] }} />
    </IconPop>
    <BigTitle delay={0.2}>2. set the details</BigTitle>
    <Subtitle delay={0.35}>hair, eyes, body type, and more</Subtitle>
    <div className="mt-1 flex w-full max-w-[17rem] flex-col gap-2.5">
      <ControlItem label="hair colour" desc="blonde, brunette, red" n={1} delay={0.5} />
      <ControlItem label="eye colour" desc="blue, green, brown" n={2} delay={0.6} />
      <ControlItem label="body type" desc="slim, athletic, curvy" n={3} delay={0.7} />
      <ControlItem label="extra details" desc="tattoos, freckles" n={4} delay={0.8} />
    </div>
  </div>
);

const Scene3 = () => (
  <div className="flex flex-col items-center gap-3">
    <IconPop delay={0.1} size={88}>
      <Camera size={52} strokeWidth={2} style={{ color: dotColors[1] }} />
    </IconPop>
    <BigTitle delay={0.2}>3. generate photos</BigTitle>
    <Subtitle delay={0.35}>realistic images in any setting</Subtitle>
    <motion.div
      className="flex items-center justify-center gap-[-8px] pt-3"
      style={{ gap: 0 }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.45 }}
    >
      <div style={{ transform: "translateY(12px)" }}>
        <PhotoCard delay={0.5} rotate={-10} index={0} />
      </div>
      <div style={{ transform: "translateY(0px)", zIndex: 2, marginLeft: -10, marginRight: -10 }}>
        <PhotoCard delay={0.6} rotate={0} index={1} />
      </div>
      <div style={{ transform: "translateY(12px)" }}>
        <PhotoCard delay={0.7} rotate={10} index={2} />
      </div>
    </motion.div>
  </div>
);


const Scene4 = () => (
  <div className="flex flex-col items-center gap-3">
    <IconPop delay={0.1} size={80}>
      <PenLine size={48} strokeWidth={2} style={{ color: dotColors[5] }} />
    </IconPop>
    <BigTitle delay={0.2}>4. add a prompt</BigTitle>
    <Subtitle delay={0.35}>describe the pose, place, and mood</Subtitle>
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

const Scene5 = ({ burst }: { burst: boolean }) => (
  <div className="relative flex flex-col items-center gap-3">
    <ParticleBurst active={burst} />
    <IconPop delay={0.1} size={96}>
      <span className="text-[5rem]">🚀</span>
    </IconPop>
    <BigTitle delay={0.2}>ready</BigTitle>
    <Subtitle delay={0.35}>sign up free and start creating</Subtitle>
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
          className="fixed inset-0 z-[9999] flex flex-col"
          style={{ background: "hsl(0 0% 0% / 0.97)" }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {/* Scene content — true vertical centre between header and controls */}
          <div className="flex-1 flex items-center justify-center overflow-hidden px-5 pt-2 pb-1">
            <div className="flex w-full max-w-sm items-center justify-center" style={{ transform: "translateY(4vh)" }}>
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
                  {step === 2 && <Scene2 />}
                  {step === 3 && <Scene3 />}
                  {step === 4 && <Scene4 />}
                  {step === 5 && <Scene5 burst={burst} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Controls — slightly raised from bottom */}
          <div className="mx-auto flex w-full max-w-sm shrink-0 flex-col items-center gap-2 px-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-1">
            {step === TOTAL_STEPS - 1 ? (
              <motion.button
                onClick={(e) => { e.stopPropagation(); handleLetsGo(); }}
                className="relative h-14 w-full rounded-2xl text-sm font-[900] lowercase tracking-tight border-[4px]"
                style={{
                  background: "linear-gradient(135deg, hsl(52 100% 58%) 0%, hsl(50 100% 55%) 70%, hsl(44 95% 52%) 100%)",
                  borderColor: "hsl(50 100% 54%)",
                  color: "#000",
                }}
                whileTap={{ scale: 0.97 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.15 }}
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
                <span className="relative z-10">let's go</span>
              </motion.button>
            ) : (
              <div className="flex items-center justify-center gap-3">
                {step > 0 && (
                  <motion.button
                    onClick={(e) => { e.stopPropagation(); setStep((s) => s - 1); }}
                    className="flex items-center justify-center rounded-2xl"
                    style={{ cursor: "pointer" }}
                    whileTap={{ scale: 1.15, background: "linear-gradient(135deg, hsl(210 100% 65%), hsl(230 85% 55%))" }}
                    animate={{ width: 56, height: 56, background: "#000", borderWidth: 2, borderColor: "hsl(0 0% 100% / 0.12)", borderStyle: "solid" }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ArrowLeft size={20} strokeWidth={2.5} style={{ color: "#fff" }} />
                  </motion.button>
                )}
                <motion.button
                  onClick={(e) => { e.stopPropagation(); advance(); }}
                  className="flex items-center justify-center rounded-2xl"
                  style={{ cursor: "pointer" }}
                  whileTap={{ scale: 1.15, background: "linear-gradient(135deg, hsl(210 100% 65%), hsl(230 85% 55%))" }}
                  animate={{ width: 56, height: 56, background: "#000", borderWidth: 2, borderColor: "hsl(0 0% 100% / 0.12)", borderStyle: "solid" }}
                  initial={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                  layout
                >
                  <ArrowRight size={20} strokeWidth={2.5} style={{ color: "#fff" }} />
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
      ) : null}
    </AnimatePresence>,
    document.body,
  );
};

export default OnboardingOverlay;
