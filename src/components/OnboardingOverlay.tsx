import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-nature-collage.jpg";

const TOTAL_STEPS = 7;

const white = "hsl(0 0% 100%)";
const whiteSoft = "hsl(0 0% 100% / 0.82)";
const whiteMuted = "hsl(0 0% 100% / 0.24)";
const panel = "hsl(0 0% 100% / 0.06)";
const panelBorder = "hsl(0 0% 100% / 0.12)";
const overlay = "hsl(0 0% 0% / 0.985)";
const amber = "hsl(39 63% 55%)";

/* vivid saturated palette — no orange */
const pink = "hsl(335 95% 60%)";
const sky = "hsl(200 100% 55%)";
const mint = "hsl(165 90% 48%)";
const lilac = "hsl(270 85% 65%)";
const lemon = "hsl(52 100% 55%)";
const ruby = "hsl(350 90% 55%)";
const cyan = "hsl(185 95% 50%)";

/* ── soft filled ball ── */
const Ball = ({ x, y, size, delay = 0, color = sky }: { x: string; y: string; size: number; delay?: number; color?: string }) => (
  <motion.div
    className="pointer-events-none absolute rounded-full"
    style={{ left: x, top: y, width: size, height: size, background: color }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 0.9, scale: [0, 1.2, 0.92, 1] }}
    transition={{ duration: 0.4, delay: delay + 0.3, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <motion.div
      className="h-full w-full rounded-full"
      animate={{ scale: [1, 1.06, 0.96, 1] }}
      transition={{ duration: 2.5, delay: delay + 1, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

/* ── paint stroke line — draws horizontally ── */
const PaintStroke = ({ x, y, width, color = pink, delay = 0, rotate = 0 }: { x: string; y: string; width: number; color?: string; delay?: number; rotate?: number }) => (
  <motion.div
    className="pointer-events-none absolute"
    style={{ left: x, top: y, height: 8, borderRadius: 9999, background: color, rotate, transformOrigin: "left center" }}
    initial={{ opacity: 0, width: 0 }}
    animate={{ opacity: 0.8, width }}
    transition={{ duration: 0.35, delay: delay + 0.3, ease: [0.2, 0.9, 0.2, 1] }}
  />
);

/* ── confetti dots that fall down ── */
const FallingDots = ({ count = 8, colors, delay = 0 }: { count?: number; colors: string[]; delay?: number }) => (
  <>
    {Array.from({ length: count }).map((_, i) => (
      <motion.div
        key={i}
        className="pointer-events-none absolute rounded-full"
        style={{
          left: `${12 + (i * 76) / count + ((i * 7) % 12)}%`,
          top: "-4%",
          width: 6 + (i % 3) * 3,
          height: 6 + (i % 3) * 3,
          background: colors[i % colors.length],
        }}
        initial={{ opacity: 0, y: 0 }}
        animate={{ opacity: [0, 0.9, 0.9, 0], y: [0, 120 + (i % 4) * 40, 260 + (i % 3) * 30, 400] }}
        transition={{ duration: 2.5, delay: delay + 0.3 + i * 0.06, ease: "easeIn", repeat: Infinity, repeatDelay: 1 }}
      />
    ))}
  </>
);

/* ── bouncing trail — a ball bounces across in an arc ── */
const BouncePath = ({ color = sky, delay = 0, fromX = "10%", toX = "80%" }: { color?: string; delay?: number; fromX?: string; toX?: string }) => (
  <motion.div
    className="pointer-events-none absolute rounded-full"
    style={{ width: 16, height: 16, background: color, top: "50%" }}
    initial={{ left: fromX, opacity: 0, y: 0 }}
    animate={{ left: [fromX, "30%", "50%", "70%", toX], opacity: [0, 1, 1, 1, 0], y: [0, -60, 0, -40, 0] }}
    transition={{ duration: 1.6, delay: delay + 0.4, ease: "easeInOut" }}
  />
);

/* ── expanding ring pulse ── */
const RingPulse = ({ x, y, size, color = lilac, delay = 0 }: { x: string; y: string; size: number; color?: string; delay?: number }) => (
  <motion.div
    className="pointer-events-none absolute rounded-full"
    style={{ left: x, top: y, width: size, height: size, border: `3px solid ${color}` }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: [0, 0.8, 0], scale: [0.3, 1.4, 2] }}
    transition={{ duration: 1.5, delay: delay + 0.4, ease: "easeOut", repeat: Infinity, repeatDelay: 2 }}
  />
);

/* ── single centered emoji — snappy bounce ── */
const CenterEmoji = ({ emoji, size = "text-[4.5rem]", delay = 0 }: { emoji: string; size?: string; delay?: number }) => (
  <motion.div
    className="pointer-events-none select-none"
    initial={{ opacity: 0, scale: 0, y: 30 }}
    animate={{ opacity: 1, scale: [0, 1.3, 0.9, 1.08, 1], y: 0 }}
    transition={{ duration: 0.45, delay: delay + 0.3, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <motion.span
      className={`block ${size}`}
      animate={{ y: [0, -10, 0], scale: [1, 1.08, 1], rotate: [0, 3, -2, 0] }}
      transition={{ duration: 1.8, delay: delay + 1, repeat: Infinity, ease: "easeInOut" }}
    >
      {emoji}
    </motion.span>
  </motion.div>
);

/* ── row of emojis — snappy stagger ── */
const EmojiRow = ({ emojis, delay = 0, size = "text-[3.5rem]", gap = 12 }: { emojis: string[]; delay?: number; size?: string; gap?: number }) => (
  <motion.div
    className="pointer-events-none flex select-none"
    style={{ gap }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.2, delay: delay + 0.3 }}
  >
    {emojis.map((emoji, i) => (
      <motion.span
        key={i}
        className={`block ${size}`}
        initial={{ opacity: 0, scale: 0, y: 30 }}
        animate={{ opacity: 1, scale: [0, 1.25, 0.9, 1], y: 0 }}
        transition={{ duration: 0.4, delay: delay + 0.35 + i * 0.08, ease: [0.2, 0.9, 0.2, 1] }}
      >
        <motion.span
          className="inline-block"
          animate={{ y: [0, -8, 0], rotate: [0, 4, -3, 0] }}
          transition={{ duration: 2, delay: delay + 1 + i * 0.2, repeat: Infinity, ease: "easeInOut" }}
        >
          {emoji}
        </motion.span>
      </motion.span>
    ))}
  </motion.div>
);

const ProgressDots = ({ current }: { current: number }) => (
  <div className="flex items-center justify-center gap-2.5 pb-3">
    {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
      <motion.div
        key={`dot-${index}-${current}`}
        className="rounded-full"
        initial={false}
        animate={{
          width: index === current ? 28 : 10,
          height: 10,
          backgroundColor: index === current ? white : whiteMuted,
        }}
        transition={{ duration: 0.22, ease: "easeOut" }}
      />
    ))}
  </div>
);

const TitleBlock = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="relative z-10 flex flex-col items-center gap-3 text-center">
    <motion.h2
      initial={{ opacity: 0, y: 18, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.45, ease: [0.2, 0.9, 0.2, 1] }}
      className="max-w-[12ch] text-3xl font-[900] lowercase tracking-tighter"
      style={{ color: white }}
    >
      {title}
    </motion.h2>
    <motion.p
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.55, ease: "easeOut" }}
      className="max-w-[18rem] text-sm font-extrabold lowercase leading-snug"
      style={{ color: whiteSoft }}
    >
      {subtitle}
    </motion.p>
  </div>
);

const PhotoCard = ({ delay, rotation, scale = 1 }: { delay: number; rotation: number; scale?: number }) => (
  <motion.div
    className="relative overflow-hidden rounded-[24px] border-[4px] shadow-soft"
    style={{ borderColor: panelBorder, scale, width: 104, height: 146 }}
    initial={{ opacity: 0, y: 28, rotate: rotation, scale: 0.86 }}
    animate={{ opacity: 1, y: 0, rotate: [rotation, rotation + 2, rotation - 1, rotation], scale }}
    transition={{
      opacity: { duration: 0.45, delay },
      y: { duration: 0.45, delay, ease: "backOut" },
      scale: { duration: 0.45, delay, ease: "backOut" },
      rotate: { duration: 4.1, delay: delay + 0.35, repeat: Infinity, ease: "easeInOut" },
    }}
  >
    <img src={heroImage} alt="" className="h-full w-full object-cover" style={{ opacity: 0.26, filter: "grayscale(1) contrast(0.95) brightness(0.95)" }} />
    <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(0 0% 100% / 0.05), hsl(0 0% 0% / 0.34))" }} />
  </motion.div>
);

const TypingLine = ({ text }: { text: string }) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let index = 0;
    const startTimer = window.setTimeout(() => {
      const interval = window.setInterval(() => {
        index += 1;
        setDisplayed(text.slice(0, index));
        if (index >= text.length) window.clearInterval(interval);
      }, 38);
    }, 550);
    return () => window.clearTimeout(startTimer);
  }, [text]);
  return (
    <span className="text-sm font-extrabold lowercase" style={{ color: "hsl(0 0% 100% / 0.66)" }}>
      {displayed}
      <motion.span className="ml-1 inline-block h-4 w-0.5 align-middle" style={{ background: "hsl(0 0% 100% / 0.52)" }} animate={{ opacity: [1, 0] }} transition={{ duration: 0.55, repeat: Infinity }} />
    </span>
  );
};

const ParticleBurst = ({ active }: { active: boolean }) => {
  const particles = useMemo(
    () => Array.from({ length: 20 }).map((_, i) => ({ angle: (i / 20) * Math.PI * 2, distance: 42 + ((i * 13) % 64), color: i % 4 === 0 ? pink : i % 4 === 1 ? sky : i % 4 === 2 ? lemon : mint })),
    [],
  );
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0">
      {particles.map((p, i) => (
        <motion.div key={i} className="absolute rounded-full" style={{ left: "50%", top: "50%", width: 6, height: 6, background: p.color }} initial={{ x: 0, y: 0, opacity: 1, scale: 1 }} animate={{ x: Math.cos(p.angle) * p.distance * 1.5, y: Math.sin(p.angle) * p.distance * 1.5, opacity: 0, scale: 0 }} transition={{ duration: 0.72, ease: "easeOut" }} />
      ))}
    </div>
  );
};

const StepScene = ({ step, burst }: { step: number; burst: boolean }) => {
  const sceneClass = "relative flex flex-col items-center gap-6";

  const scenes: Record<number, React.ReactNode> = {
    /* ── 0: welcome — paint strokes draw out from sides ── */
    0: (
      <div className={sceneClass}>
        <PaintStroke x="8%" y="18%" width={90} color={pink} delay={0} rotate={-8} />
        <PaintStroke x="55%" y="28%" width={70} color={sky} delay={0.1} rotate={5} />
        <PaintStroke x="20%" y="72%" width={60} color={mint} delay={0.15} rotate={-3} />
        <Ball x="82%" y="12%" size={32} color={lilac} delay={0.08} />
        <Ball x="6%" y="62%" size={24} color={lemon} delay={0.18} />
        <CenterEmoji emoji="👋" size="text-[5.5rem]" delay={0.1} />
        <TitleBlock title="welcome to vizura" subtitle="quick walkthrough so you instantly get how character creation works" />
      </div>
    ),
    /* ── 1: make any character — bouncing ball trail across ── */
    1: (
      <div className={sceneClass}>
        <BouncePath color={pink} delay={0} fromX="5%" toX="90%" />
        <BouncePath color={sky} delay={0.3} fromX="90%" toX="5%" />
        <Ball x="8%" y="8%" size={28} color={lilac} delay={0.1} />
        <Ball x="80%" y="68%" size={22} color={cyan} delay={0.2} />
        <motion.div
          className="relative flex items-center justify-center overflow-hidden rounded-[28px] border-[4px]"
          style={{ borderColor: panelBorder, background: panel, width: 125, height: 187 }}
          initial={{ opacity: 0, scale: 0.7, y: 30 }}
          animate={{ opacity: 1, scale: [0.7, 1.08, 0.96, 1], y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: [0.2, 0.9, 0.2, 1] }}
        >
          <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.2, filter: "grayscale(1) blur(0.5px)" }} />
          <motion.span className="relative z-10 text-7xl" animate={{ scale: [1, 1.15, 0.95, 1.05, 1], rotate: [0, 5, -3, 0] }} transition={{ duration: 2, delay: 1.2, repeat: Infinity, ease: "easeInOut" }}>
            🫶
          </motion.span>
        </motion.div>
        <TitleBlock title="make any character" subtitle="start with a vibe, a face, a mood, or a whole fantasy and build from there" />
      </div>
    ),
    /* ── 2: shape their look — confetti dots rain down ── */
    2: (
      <div className={sceneClass}>
        <FallingDots count={10} colors={[pink, sky, lilac, mint, lemon]} delay={0} />
        <Ball x="84%" y="10%" size={26} color={ruby} delay={0.1} />
        <Ball x="4%" y="65%" size={20} color={cyan} delay={0.15} />
        <EmojiRow emojis={["💇", "👁️", "🧍"]} delay={0.05} size="text-[3.8rem]" gap={16} />
        <TitleBlock title="shape their look" subtitle="choose traits like hair, eyes, and body type and watch the setup come alive" />
        <div className="flex flex-col gap-2 text-center">
          {["hair colour", "eye colour", "body type"].map((item, index) => (
            <motion.div key={item} className="rounded-2xl px-5 py-2.5 text-sm font-extrabold lowercase" style={{ background: panel, color: whiteSoft }} initial={{ opacity: 0, y: 16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.25, delay: 0.7 + index * 0.08, ease: [0.2, 0.9, 0.2, 1] }}>
              {item}
            </motion.div>
          ))}
        </div>
      </div>
    ),
    /* ── 3: not perfect? — expanding ring pulses ── */
    3: (
      <div className={sceneClass}>
        <RingPulse x="20%" y="15%" size={50} color={pink} delay={0} />
        <RingPulse x="60%" y="60%" size={40} color={sky} delay={0.4} />
        <RingPulse x="75%" y="20%" size={35} color={mint} delay={0.8} />
        <Ball x="6%" y="65%" size={24} color={lilac} delay={0.1} />
        <Ball x="85%" y="8%" size={20} color={lemon} delay={0.15} />
        <motion.div className="text-[5.5rem]" initial={{ opacity: 0, scale: 0, rotate: -180 }} animate={{ opacity: 1, scale: [0, 1.2, 0.9, 1], rotate: 0 }} transition={{ duration: 0.5, delay: 0.5, ease: [0.2, 0.9, 0.2, 1] }}>
          <motion.span className="inline-block" animate={{ rotate: [0, 360] }} transition={{ duration: 3, delay: 1.2, repeat: Infinity, ease: "linear" }}>🔄</motion.span>
        </motion.div>
        <TitleBlock title="not perfect?" subtitle="run it again anytime — every new attempt costs one credit and gives fresh options" />
      </div>
    ),
    /* ── 4: create photos — paint strokes frame the photos ── */
    4: (
      <div className={sceneClass}>
        <PaintStroke x="4%" y="10%" width={80} color={sky} delay={0} rotate={2} />
        <PaintStroke x="60%" y="70%" width={100} color={pink} delay={0.1} rotate={-4} />
        <Ball x="86%" y="6%" size={26} color={mint} delay={0.08} />
        <Ball x="4%" y="72%" size={20} color={lilac} delay={0.15} />
        <CenterEmoji emoji="📸" size="text-[5rem]" delay={0.05} />
        <TitleBlock title="create photos" subtitle="your character can turn into polished image sets with depth, variation, and style" />
        <div className="flex items-center justify-center gap-4">
          <PhotoCard delay={0.55} rotation={-10} scale={0.96} />
          <PhotoCard delay={0.65} rotation={0} scale={1.02} />
          <PhotoCard delay={0.75} rotation={10} scale={0.96} />
        </div>
      </div>
    ),
    /* ── 5: describe — bouncing ball + paint stroke ── */
    5: (
      <div className={sceneClass}>
        <BouncePath color={lilac} delay={0} fromX="15%" toX="85%" />
        <Ball x="82%" y="8%" size={28} color={pink} delay={0.08} />
        <Ball x="4%" y="68%" size={22} color={cyan} delay={0.12} />
        <PaintStroke x="10%" y="80%" width={70} color={mint} delay={0.15} rotate={-2} />
        <CenterEmoji emoji="✍️" size="text-[5rem]" delay={0.05} />
        <TitleBlock title="describe what you want" subtitle="add prompt details like lighting, pose, setting, outfit, mood, or camera feel" />
        <motion.div className="w-full rounded-[24px] border-[4px] px-5 py-4" style={{ borderColor: panelBorder, background: panel }} initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.3, delay: 0.6, ease: [0.2, 0.9, 0.2, 1] }}>
          <div className="mb-3 text-xs font-extrabold lowercase" style={{ color: "hsl(0 0% 100% / 0.4)" }}>example prompt</div>
          <TypingLine text="golden hour portrait, soft dress, cafe mood" />
        </motion.div>
      </div>
    ),
    /* ── 6: ready to create? — full celebration ── */
    6: (
      <div className={sceneClass}>
        <ParticleBurst active={burst} />
        <FallingDots count={12} colors={[pink, sky, lilac, mint, lemon, ruby, cyan]} delay={0} />
        <RingPulse x="40%" y="20%" size={60} color={pink} delay={0.2} />
        <RingPulse x="25%" y="50%" size={45} color={sky} delay={0.6} />
        <Ball x="8%" y="10%" size={30} color={lilac} delay={0.05} />
        <Ball x="82%" y="65%" size={24} color={mint} delay={0.1} />
        <CenterEmoji emoji="🚀" size="text-[5.5rem]" delay={0.1} />
        <TitleBlock title="ready to create?" subtitle="sign up free and jump straight into your first character build" />
      </div>
    ),
  };

  return <>{scenes[step]}</>;
};

const OnboardingOverlay = ({ open, onDismiss }: { open: boolean; onDismiss: () => void }) => {
  const [step, setStep] = useState(0);
  const [burst, setBurst] = useState(false);
  const [mounted, setMounted] = useState(false);

  const advance = useCallback(() => {
    setStep((current) => (current < TOTAL_STEPS - 1 ? current + 1 : current));
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    setStep(0);
    setBurst(false);

    const root = document.getElementById("root");
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    const previousRootOverflow = root?.style.overflow ?? "";
    const previousRootTouchAction = root?.style.touchAction ?? "";

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    if (root) {
      root.style.overflow = "hidden";
      root.style.touchAction = "none";
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      if (root) {
        root.style.overflow = previousRootOverflow;
        root.style.touchAction = previousRootTouchAction;
      }
    };
  }, [open]);

  // no autoplay — only advance on tap

  const handleLetsGo = () => {
    setBurst(true);
    window.setTimeout(onDismiss, 720);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.24 }}
          onClick={step < TOTAL_STEPS - 1 ? advance : undefined}
          style={{ cursor: step < TOTAL_STEPS - 1 ? "pointer" : "default" }}
        >
          <div className="absolute inset-0 overflow-hidden">
            <img src={heroImage} alt="" className="h-full w-full object-cover" style={{ opacity: 0.1, filter: "grayscale(1) blur(6px) contrast(0.95)" }} />
            <div className="absolute inset-0" style={{ background: overlay }} />
          </div>

          <motion.div
            className="relative z-10 mx-4 flex w-full max-w-sm flex-col items-center"
            initial={{ y: 14, opacity: 0.96 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.34, ease: "easeOut" }}
          >
            <div className="flex w-full items-center justify-center px-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  className="w-full"
                  initial={{ opacity: 0, x: 40, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -40, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: [0.2, 0.9, 0.2, 1] }}
                >
                  <StepScene step={step} burst={burst} />
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-1 flex w-full flex-col items-center gap-4">
              {step === TOTAL_STEPS - 1 ? (
                <motion.button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleLetsGo();
                  }}
                  className="relative h-14 w-full overflow-hidden rounded-2xl text-sm font-[900] lowercase tracking-tight"
                  style={{ background: white, color: "hsl(0 0% 0%)" }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, delay: 0.18 }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    animate={{ boxShadow: [`0 0 0 0 ${amber}33`, `0 0 0 12px hsl(39 63% 55% / 0)`, `0 0 0 0 hsl(39 63% 55% / 0)`] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                  <span className="relative z-10">let’s go</span>
                </motion.button>
              ) : (
                <motion.div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: "hsl(0 0% 0%)" }}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  aria-hidden
                >
                  <ArrowRight size={22} strokeWidth={2.5} style={{ color: white }} />
                </motion.div>
              )}

              {step < TOTAL_STEPS - 1 ? (
                <motion.p
                  className="text-xs font-extrabold lowercase"
                  style={{ color: "hsl(0 0% 100% / 0.24)" }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.28, delay: 0.45 }}
                >
                  tap anywhere
                </motion.p>
              ) : null}

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
