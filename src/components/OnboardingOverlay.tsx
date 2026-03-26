import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import heroImage from "@/assets/hero-nature-collage.jpg";

const TOTAL_STEPS = 7;
const AUTO_ADVANCE_MS = 5200;

const white = "hsl(0 0% 100%)";
const whiteSoft = "hsl(0 0% 100% / 0.64)";
const whiteMuted = "hsl(0 0% 100% / 0.24)";
const panel = "hsl(0 0% 100% / 0.06)";
const panelBorder = "hsl(0 0% 100% / 0.12)";
const overlay = "hsl(0 0% 0% / 0.985)";
const amber = "hsl(39 63% 55%)";

const Blob = ({ x, y, size, delay = 0, opacity = 0.12 }: { x: string; y: string; size: number; delay?: number; opacity?: number }) => (
  <motion.div
    className="pointer-events-none absolute rounded-full"
    style={{
      left: x,
      top: y,
      width: size,
      height: size,
      background: `hsl(0 0% 100% / ${opacity})`,
      filter: "blur(34px)",
    }}
    initial={{ opacity: 0, scale: 0.75 }}
    animate={{ opacity: [opacity * 0.5, opacity, opacity * 0.55], scale: [0.92, 1.06, 0.95], x: [0, 10, -8, 0], y: [0, -10, 8, 0] }}
    transition={{ duration: 6.5, delay, repeat: Infinity, ease: "easeInOut" }}
  />
);

const FloatEmoji = ({ emoji, x, y, delay = 0, size = "text-4xl" }: { emoji: string; x: string; y: string; delay?: number; size?: string }) => (
  <motion.span
    className={`pointer-events-none absolute select-none ${size}`}
    style={{ left: x, top: y }}
    initial={{ opacity: 0, scale: 0.6, y: 18 }}
    animate={{ opacity: 1, scale: [0.72, 1.08, 1], y: [18, -7, 0] }}
    transition={{ duration: 0.65, delay, ease: "backOut" }}
  >
    <motion.span
      className="inline-block"
      animate={{ y: [0, -6, 0], rotate: [0, 6, -6, 0] }}
      transition={{ duration: 2.7, delay: delay + 0.35, repeat: Infinity, ease: "easeInOut" }}
    >
      {emoji}
    </motion.span>
  </motion.span>
);

const SparkleEmoji = ({ emoji, x, y, delay = 0 }: { emoji: string; x: string; y: string; delay?: number }) => (
  <motion.span
    className="pointer-events-none absolute select-none text-3xl"
    style={{ left: x, top: y }}
    initial={{ opacity: 0, scale: 0.4 }}
    animate={{ opacity: [0, 1, 0.25, 1, 0], scale: [0.5, 1.15, 0.82, 1, 0.6] }}
    transition={{ duration: 2.8, delay, repeat: Infinity, ease: "easeInOut" }}
  >
    {emoji}
  </motion.span>
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
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, ease: "easeOut" }}
      className="max-w-[12ch] text-3xl font-[900] lowercase tracking-tighter"
      style={{ color: white }}
    >
      {title}
    </motion.h2>
    <motion.p
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.38, delay: 0.08, ease: "easeOut" }}
      className="max-w-[18rem] text-sm font-extrabold lowercase leading-snug"
      style={{ color: whiteSoft }}
    >
      {subtitle}
    </motion.p>
  </div>
);

const PhotoCard = ({ delay, rotation, scale = 1 }: { delay: number; rotation: number; scale?: number }) => (
  <motion.div
    className="relative h-28 w-20 overflow-hidden rounded-[20px] border-[4px] shadow-soft"
    style={{ borderColor: panelBorder, scale }}
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
  const sceneClass = "relative flex min-h-[390px] flex-col items-center justify-center gap-5 overflow-hidden";

  const scenes: Record<number, React.ReactNode> = {
    0: (
      <div className={sceneClass}>
        <Blob x="4%" y="8%" size={108} delay={0.1} />
        <Blob x="72%" y="64%" size={94} delay={0.5} opacity={0.09} />
        <FloatEmoji emoji="👋" x="10%" y="20%" delay={0.25} size="text-5xl" />
        <FloatEmoji emoji="🌊" x="78%" y="20%" delay={0.5} size="text-4xl" />
        <FloatEmoji emoji="✨" x="16%" y="72%" delay={0.75} size="text-3xl" />
        <TitleBlock title="welcome to vizura" subtitle="quick walkthrough so you instantly get how character creation works" />
      </div>
    ),
    1: (
      <div className={sceneClass}>
        <Blob x="18%" y="10%" size={118} delay={0.15} />
        <SparkleEmoji emoji="✨" x="10%" y="22%" delay={0.2} />
        <SparkleEmoji emoji="✨" x="82%" y="18%" delay={0.65} />
        <SparkleEmoji emoji="💫" x="74%" y="70%" delay={1.05} />
        <motion.div
          className="relative flex h-36 w-24 items-center justify-center overflow-hidden rounded-[24px] border-[4px]"
          style={{ borderColor: panelBorder, background: panel }}
          initial={{ opacity: 0, scale: 0.85, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.35, ease: "backOut" }}
        >
          <img src={heroImage} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ opacity: 0.2, filter: "grayscale(1) blur(0.5px)" }} />
          <motion.span className="relative z-10 text-5xl" animate={{ opacity: [0.45, 1, 0.55], scale: [0.94, 1.04, 0.98] }} transition={{ duration: 2.3, repeat: Infinity }}>
            🫶
          </motion.span>
        </motion.div>
        <TitleBlock title="make any character" subtitle="start with a vibe, a face, a mood, or a whole fantasy and build from there" />
      </div>
    ),
    2: (
      <div className={sceneClass}>
        <Blob x="68%" y="10%" size={108} delay={0.15} />
        <TitleBlock title="shape their look" subtitle="choose traits like hair, eyes, and body type and watch the setup come alive" />
        <div className="flex items-center justify-center gap-3">
          {[
            { emoji: "💇", delay: 0.4 },
            { emoji: "👁️", delay: 0.55 },
            { emoji: "🧍", delay: 0.7 },
          ].map((item) => (
            <motion.div
              key={item.emoji}
              className="flex h-11 w-11 items-center justify-center rounded-2xl border-[4px] text-2xl"
              style={{ borderColor: panelBorder, background: panel }}
              initial={{ opacity: 0, y: 16, scale: 0.45 }}
              animate={{ opacity: 1, y: 0, scale: [0.45, 1.12, 1] }}
              transition={{ duration: 0.4, delay: item.delay, ease: "backOut" }}
            >
              {item.emoji}
            </motion.div>
          ))}
        </div>
        <div className="flex flex-col gap-2 text-center">
          {["hair colour", "eye colour", "body type"].map((item, index) => (
            <motion.div
              key={item}
              className="rounded-2xl px-5 py-2.5 text-sm font-extrabold lowercase"
              style={{ background: panel, color: whiteSoft }}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.78 + index * 0.1, ease: "easeOut" }}
            >
              {item}
            </motion.div>
          ))}
        </div>
      </div>
    ),
    3: (
      <div className={sceneClass}>
        <Blob x="14%" y="10%" size={116} delay={0.2} />
        <FloatEmoji emoji="✨" x="76%" y="24%" delay={0.55} size="text-3xl" />
        <motion.div
          className="text-5xl"
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.42, ease: "backOut" }}
        >
          <motion.span className="inline-block" animate={{ rotate: 360 }} transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}>
            🔄
          </motion.span>
        </motion.div>
        <TitleBlock title="not perfect?" subtitle="run it again anytime — every new attempt costs one credit and gives fresh options" />
      </div>
    ),
    4: (
      <div className={sceneClass}>
        <Blob x="22%" y="10%" size={124} delay={0.1} />
        <FloatEmoji emoji="📸" x="80%" y="18%" delay={0.45} size="text-4xl" />
        <TitleBlock title="create photos" subtitle="your character can turn into polished image sets with depth, variation, and style" />
        <div className="flex items-center justify-center gap-4">
          <PhotoCard delay={0.4} rotation={-10} scale={0.96} />
          <PhotoCard delay={0.56} rotation={0} scale={1.02} />
          <PhotoCard delay={0.72} rotation={10} scale={0.96} />
        </div>
      </div>
    ),
    5: (
      <div className={sceneClass}>
        <Blob x="8%" y="12%" size={118} delay={0.12} />
        <FloatEmoji emoji="✍️" x="78%" y="20%" delay={0.4} size="text-4xl" />
        <TitleBlock title="describe what you want" subtitle="add prompt details like lighting, pose, setting, outfit, mood, or camera feel" />
        <motion.div
          className="w-full rounded-[24px] border-[4px] px-5 py-4"
          style={{ borderColor: panelBorder, background: panel }}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.42, ease: "easeOut" }}
        >
          <div className="mb-3 text-xs font-extrabold lowercase" style={{ color: "hsl(0 0% 100% / 0.26)" }}>example prompt</div>
          <TypingLine text="golden hour portrait, soft dress, cafe mood" />
        </motion.div>
      </div>
    ),
    6: (
      <div className={sceneClass}>
        <ParticleBurst active={burst} />
        <Blob x="14%" y="12%" size={122} delay={0.15} />
        <Blob x="70%" y="62%" size={104} delay={0.55} opacity={0.09} />
        <FloatEmoji emoji="✨" x="12%" y="24%" delay={0.4} size="text-4xl" />
        <FloatEmoji emoji="🚀" x="82%" y="20%" delay={0.62} size="text-4xl" />
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

  useEffect(() => {
    if (!open || step >= TOTAL_STEPS - 1) return;
    const timer = window.setTimeout(advance, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [advance, open, step]);

  const handleLetsGo = () => {
    setBurst(true);
    window.setTimeout(onDismiss, 720);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-end pb-[14vh]"
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
            <div className="flex min-h-[420px] w-full items-center justify-center px-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  className="w-full"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
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
