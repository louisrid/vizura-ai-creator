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

/* vivid saturated candy palette */
const pink = "hsl(330 92% 62%)";
const coral = "hsl(12 95% 62%)";
const sky = "hsl(200 95% 58%)";
const mint = "hsl(165 80% 50%)";
const lilac = "hsl(270 80% 68%)";
const peach = "hsl(25 100% 66%)";
const lemon = "hsl(50 95% 60%)";

/* ── bouncy filled ball — always perfectly round, never jagged ── */
const Ball = ({ x, y, size, delay = 0, color = sky }: { x: string; y: string; size: number; delay?: number; color?: string }) => (
  <motion.div
    className="pointer-events-none absolute overflow-hidden rounded-full"
    style={{ left: x, top: y, width: size, height: size, background: color, borderRadius: "50%" }}
    initial={{ opacity: 0, scale: 0, y: 16 }}
    animate={{ opacity: 0.9, scale: [0, 1.2, 0.92, 1.04, 1], y: 0 }}
    transition={{ duration: 0.45, delay: delay + 0.4, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <motion.div
      className="h-full w-full rounded-full"
      style={{ background: "inherit", borderRadius: "50%" }}
      animate={{ scale: [1, 1.08, 0.94, 1.03, 1] }}
      transition={{ duration: 2.4, delay: delay + 1.2, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

/* ── bouncy ring — always perfectly round ── */
const BouncyRing = ({ x, y, size, delay = 0, color = pink }: { x: string; y: string; size: number; delay?: number; color?: string }) => (
  <motion.div
    className="pointer-events-none absolute overflow-hidden rounded-full"
    style={{ left: x, top: y, width: size, height: size, border: `4px solid ${color}`, borderRadius: "50%" }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 0.75, scale: [0, 1.15, 0.9, 1.03, 1] }}
    transition={{ duration: 0.45, delay: delay + 0.5, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <motion.div
      className="h-full w-full rounded-full"
      style={{ borderRadius: "50%" }}
      animate={{ scale: [1, 1.06, 0.95, 1] }}
      transition={{ duration: 2.8, delay: delay + 1.4, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
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
    <img
      src={heroImage}
      alt=""
      className="h-full w-full object-cover"
      style={{ opacity: 0.26, filter: "grayscale(1) contrast(0.95) brightness(0.95)" }}
    />
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
      <motion.span
        className="ml-1 inline-block h-4 w-0.5 align-middle"
        style={{ background: "hsl(0 0% 100% / 0.52)" }}
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.55, repeat: Infinity }}
      />
    </span>
  );
};

const ParticleBurst = ({ active }: { active: boolean }) => {
  const particles = useMemo(
    () => Array.from({ length: 20 }).map((_, index) => ({ angle: (index / 20) * Math.PI * 2, distance: 42 + ((index * 13) % 64), color: index % 3 === 0 ? amber : white })),
    [],
  );

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((particle, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full"
          style={{ left: "50%", top: "50%", width: 4, height: 4, background: particle.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: Math.cos(particle.angle) * particle.distance, y: Math.sin(particle.angle) * particle.distance, opacity: 0, scale: 0 }}
          transition={{ duration: 0.72, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};

const StepScene = ({ step, burst }: { step: number; burst: boolean }) => {
  /* layout: visual area on top, text below — no absolute overlap */
  const sceneClass = "relative flex flex-col items-center gap-6 overflow-hidden";
  /* background shapes layer behind everything */
  const shapesClass = "pointer-events-none absolute inset-0";

  const scenes: Record<number, React.ReactNode> = {
    /* ── 0: welcome ── */
    0: (
      <div className={sceneClass}>
        <div className={shapesClass}>
          <Ball x="2%" y="2%" size={36} color={sky} delay={0} />
          <Ball x="80%" y="65%" size={24} color={pink} delay={0.1} />
          <Ball x="85%" y="5%" size={18} color={lemon} delay={0.2} />
          <BouncyRing x="70%" y="2%" size={32} color={lilac} delay={0.15} />
          <Ball x="5%" y="68%" size={14} color={coral} delay={0.25} />
          <Ball x="88%" y="38%" size={10} color={mint} delay={0.3} />
        </div>
        <CenterEmoji emoji="👋" size="text-[5.5rem]" delay={0.1} />
        <TitleBlock title="welcome to vizura" subtitle="quick walkthrough so you instantly get how character creation works" />
      </div>
    ),
    /* ── 1: make any character ── */
    1: (
      <div className={sceneClass}>
        <div className={shapesClass}>
          <Ball x="3%" y="3%" size={32} color={lilac} delay={0} />
          <Ball x="82%" y="60%" size={22} color={sky} delay={0.1} />
          <BouncyRing x="80%" y="3%" size={28} color={coral} delay={0.12} />
          <Ball x="5%" y="62%" size={16} color={peach} delay={0.2} />
          <Ball x="88%" y="35%" size={12} color={mint} delay={0.25} />
        </div>
        <motion.div
          className="relative flex items-center justify-center overflow-hidden rounded-[28px] border-[4px]"
          style={{ borderColor: panelBorder, background: panel, width: 125, height: 187 }}
          initial={{ opacity: 0, scale: 0.7, y: 30 }}
          animate={{ opacity: 1, scale: [0.7, 1.08, 0.96, 1], y: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: [0.2, 0.9, 0.2, 1] }}
        >
          <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.2, filter: "grayscale(1) blur(0.5px)" }} />
          <motion.span
            className="relative z-10 text-7xl"
            animate={{ scale: [1, 1.15, 0.95, 1.05, 1], rotate: [0, 5, -3, 0] }}
            transition={{ duration: 2, delay: 1.2, repeat: Infinity, ease: "easeInOut" }}
          >
            🫶
          </motion.span>
        </motion.div>
        <TitleBlock title="make any character" subtitle="start with a vibe, a face, a mood, or a whole fantasy and build from there" />
      </div>
    ),
    /* ── 2: shape their look ── */
    2: (
      <div className={sceneClass}>
        <div className={shapesClass}>
          <Ball x="80%" y="2%" size={30} color={coral} delay={0} />
          <Ball x="2%" y="60%" size={24} color={sky} delay={0.08} />
          <BouncyRing x="84%" y="55%" size={26} color={mint} delay={0.15} />
          <Ball x="5%" y="5%" size={16} color={lemon} delay={0.12} />
          <Ball x="90%" y="35%" size={12} color={lilac} delay={0.2} />
        </div>
        <EmojiRow emojis={["💇", "👁️", "🧍"]} delay={0.05} size="text-[3.8rem]" gap={16} />
        <TitleBlock title="shape their look" subtitle="choose traits like hair, eyes, and body type and watch the setup come alive" />
        <div className="flex flex-col gap-2 text-center">
          {["hair colour", "eye colour", "body type"].map((item, index) => (
            <motion.div
              key={item}
              className="rounded-2xl px-5 py-2.5 text-sm font-extrabold lowercase"
              style={{ background: panel, color: whiteSoft }}
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.25, delay: 0.7 + index * 0.08, ease: [0.2, 0.9, 0.2, 1] }}
            >
              {item}
            </motion.div>
          ))}
        </div>
      </div>
    ),
    /* ── 3: not perfect? ── */
    3: (
      <div className={sceneClass}>
        <div className={shapesClass}>
          <Ball x="3%" y="3%" size={34} color={peach} delay={0} />
          <Ball x="82%" y="62%" size={20} color={sky} delay={0.1} />
          <BouncyRing x="80%" y="4%" size={30} color={pink} delay={0.08} />
          <Ball x="6%" y="64%" size={14} color={mint} delay={0.18} />
          <Ball x="88%" y="30%" size={10} color={lemon} delay={0.22} />
        </div>
        <motion.div
          className="text-[5.5rem]"
          initial={{ opacity: 0, scale: 0, rotate: -180 }}
          animate={{ opacity: 1, scale: [0, 1.2, 0.9, 1], rotate: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: [0.2, 0.9, 0.2, 1] }}
        >
          <motion.span className="inline-block" animate={{ rotate: [0, 360] }} transition={{ duration: 3, delay: 1.2, repeat: Infinity, ease: "linear" }}>
            🔄
          </motion.span>
        </motion.div>
        <TitleBlock title="not perfect?" subtitle="run it again anytime — every new attempt costs one credit and gives fresh options" />
      </div>
    ),
    /* ── 4: create photos ── */
    4: (
      <div className={sceneClass}>
        <div className={shapesClass}>
          <Ball x="3%" y="3%" size={30} color={sky} delay={0} />
          <Ball x="84%" y="60%" size={22} color={coral} delay={0.1} />
          <BouncyRing x="82%" y="3%" size={28} color={lilac} delay={0.08} />
          <Ball x="5%" y="62%" size={14} color={lemon} delay={0.18} />
          <Ball x="90%" y="32%" size={10} color={pink} delay={0.22} />
        </div>
        <CenterEmoji emoji="📸" size="text-[5rem]" delay={0.05} />
        <TitleBlock title="create photos" subtitle="your character can turn into polished image sets with depth, variation, and style" />
        <div className="flex items-center justify-center gap-4">
          <PhotoCard delay={0.55} rotation={-10} scale={0.96} />
          <PhotoCard delay={0.65} rotation={0} scale={1.02} />
          <PhotoCard delay={0.75} rotation={10} scale={0.96} />
        </div>
      </div>
    ),
    /* ── 5: describe what you want ── */
    5: (
      <div className={sceneClass}>
        <div className={shapesClass}>
          <Ball x="78%" y="2%" size={32} color={mint} delay={0} />
          <Ball x="2%" y="58%" size={22} color={pink} delay={0.08} />
          <BouncyRing x="3%" y="3%" size={28} color={sky} delay={0.1} />
          <Ball x="88%" y="55%" size={14} color={peach} delay={0.18} />
          <Ball x="5%" y="30%" size={10} color={lilac} delay={0.22} />
        </div>
        <CenterEmoji emoji="✍️" size="text-[5rem]" delay={0.05} />
        <TitleBlock title="describe what you want" subtitle="add prompt details like lighting, pose, setting, outfit, mood, or camera feel" />
        <motion.div
          className="w-full rounded-[24px] border-[4px] px-5 py-4"
          style={{ borderColor: panelBorder, background: panel }}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.6, ease: [0.2, 0.9, 0.2, 1] }}
        >
          <div className="mb-3 text-xs font-extrabold lowercase" style={{ color: "hsl(0 0% 100% / 0.4)" }}>example prompt</div>
          <TypingLine text="golden hour portrait, soft dress, cafe mood" />
        </motion.div>
      </div>
    ),
    /* ── 6: ready to create? ── */
    6: (
      <div className={sceneClass}>
        <div className={shapesClass}>
          <ParticleBurst active={burst} />
          <Ball x="3%" y="3%" size={36} color={coral} delay={0} />
          <Ball x="80%" y="58%" size={26} color={sky} delay={0.08} />
          <Ball x="84%" y="3%" size={20} color={lemon} delay={0.12} />
          <BouncyRing x="78%" y="30%" size={30} color={pink} delay={0.1} />
          <BouncyRing x="2%" y="55%" size={24} color={mint} delay={0.18} />
          <Ball x="8%" y="32%" size={12} color={lilac} delay={0.22} />
          <Ball x="90%" y="60%" size={10} color={peach} delay={0.26} />
        </div>
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
