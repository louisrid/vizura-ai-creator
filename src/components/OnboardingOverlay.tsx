import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const TOTAL_STEPS = 7;

const white = "hsl(0 0% 100%)";
const textBody = "hsl(0 0% 100% / 0.88)";
const textMuted = "hsl(0 0% 100% / 0.52)";
const panel = "hsl(0 0% 100% / 0.07)";
const panelBorder = "hsl(0 0% 100% / 0.12)";
const overlay = "hsl(0 0% 8% / 0.97)";

/* pastel palette — saturated but light */
const blue1 = "hsl(210 85% 72%)";
const blue2 = "hsl(230 75% 68%)";
const pink = "hsl(330 70% 72%)";
const orange = "hsl(25 85% 70%)";
const yellow = "hsl(45 85% 68%)";
const green = "hsl(155 60% 58%)";
const red = "hsl(0 70% 68%)";

/* shapes removed — emoji-only scenes */

/* ── single centered emoji ── */
const CenterEmoji = ({ emoji, size = "text-[4.5rem]", delay = 0, y = "20%" }: { emoji: string; size?: string; delay?: number; y?: string }) => (
  <motion.div
    className="pointer-events-none absolute left-1/2 select-none"
    style={{ top: y, transform: "translateX(-50%)" }}
    initial={{ opacity: 0, scale: 0.3, y: 20, filter: "blur(4px)" }}
    animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)", x: "-50%" }}
    transition={{ duration: 0.45, delay: delay + 0.4, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <motion.span
      className={`block ${size}`}
      animate={{ y: [0, -6, 0], scale: [1, 1.04, 1] }}
      transition={{ duration: 4, delay: delay + 1.2, repeat: Infinity, ease: "easeInOut" }}
    >
      {emoji}
    </motion.span>
  </motion.div>
);

/* ── row of emojis ── */
const EmojiRow = ({ emojis, delay = 0, y = "18%", size = "text-[3.5rem]", gap = 12 }: { emojis: string[]; delay?: number; y?: string; size?: string; gap?: number }) => (
  <motion.div
    className="pointer-events-none absolute left-1/2 flex select-none"
    style={{ top: y, transform: "translateX(-50%)", gap }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1, x: "-50%" }}
    transition={{ duration: 0.35, delay: delay + 0.5 }}
  >
    {emojis.map((emoji, i) => (
      <motion.span
        key={i}
        className={`block ${size}`}
        initial={{ opacity: 0, scale: 0.2, y: 20 }}
        animate={{ opacity: 1, scale: [0.2, 1.1, 1], y: 0 }}
        transition={{ duration: 0.45, delay: delay + 0.5 + i * 0.1, ease: [0.2, 0.9, 0.2, 1] }}
      >
        <motion.span
          className="inline-block"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 3.5, delay: delay + 1.2 + i * 0.25, repeat: Infinity, ease: "easeInOut" }}
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
          background: index === current ? `linear-gradient(135deg, ${blue1}, ${blue2})` : "hsl(0 0% 100% / 0.2)",
        }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      />
    ))}
  </div>
);

const TitleBlock = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="relative z-10 flex flex-col items-center gap-2.5 pt-6 text-center">
    <motion.h2
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: 0.5, ease: "easeOut" }}
      className="max-w-[14ch] text-[2rem] font-[900] lowercase leading-[1.1] tracking-tighter"
      style={{ color: white }}
    >
      {title}
    </motion.h2>
    <motion.p
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, delay: 0.62, ease: "easeOut" }}
      className="max-w-[18rem] text-[0.8rem] font-extrabold lowercase leading-snug"
      style={{ color: textBody }}
    >
      {subtitle}
    </motion.p>
  </div>
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
      }, 30);
    }, 400);
    return () => window.clearTimeout(startTimer);
  }, [text]);

  return (
    <span className="text-sm font-extrabold lowercase" style={{ color: textBody }}>
      {displayed}
      <motion.span
        className="ml-1 inline-block h-4 w-0.5 align-middle"
        style={{ background: blue1 }}
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      />
    </span>
  );
};

const ParticleBurst = ({ active }: { active: boolean }) => {
  const colors = [blue1, blue2, pink, orange, yellow, green, red];
  const particles = useMemo(
    () => Array.from({ length: 24 }).map((_, index) => ({
      angle: (index / 24) * Math.PI * 2,
      distance: 42 + ((index * 13) % 64),
      color: colors[index % colors.length],
    })),
    [],
  );

  if (!active) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((particle, index) => (
        <motion.div
          key={index}
          className="absolute rounded-full"
          style={{ left: "50%", top: "50%", width: 5, height: 5, background: particle.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{ x: Math.cos(particle.angle) * particle.distance, y: Math.sin(particle.angle) * particle.distance, opacity: 0, scale: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};

const StepScene = ({ step, burst }: { step: number; burst: boolean }) => {
  const sceneClass = "relative flex min-h-[420px] flex-col items-center justify-end gap-4 overflow-hidden pb-2";

  const scenes: Record<number, React.ReactNode> = {
    0: (
      <div className={sceneClass}>
        <CenterEmoji emoji="👋" size="text-[5rem]" delay={0.1} y="18%" />
        <TitleBlock title="welcome to vizura" subtitle="quick walkthrough so you instantly get how character creation works" />
      </div>
    ),
    1: (
      <div className={sceneClass}>
        <CenterEmoji emoji="🫶" size="text-[5.5rem]" delay={0.1} y="16%" />
        <TitleBlock title="make any character" subtitle="start with a vibe, a face, a mood, or a whole fantasy and build from there" />
      </div>
    ),
    2: (
      <div className={sceneClass}>
        <EmojiRow emojis={["💇", "👁️", "🧍"]} delay={0.1} y="14%" size="text-[3.8rem]" gap={16} />
        <TitleBlock title="shape their look" subtitle="choose traits like hair, eyes, and body type and watch the setup come alive" />
        <div className="flex flex-col gap-2 text-center">
          {["hair colour", "eye colour", "body type"].map((item, index) => (
            <motion.div
              key={item}
              className="rounded-2xl px-5 py-2.5 text-sm font-extrabold lowercase"
              style={{ background: panel, color: textBody, borderLeft: `3px solid ${[pink, blue1, green][index]}` }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: 0.7 + index * 0.08, ease: "easeOut" }}
            >
              {item}
            </motion.div>
          ))}
        </div>
      </div>
    ),
    3: (
      <div className={sceneClass}>
        <motion.div
          className="text-[5.5rem]"
          initial={{ opacity: 0, scale: 0.3, y: 16, rotate: -30 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.5, delay: 0.5, ease: [0.2, 0.9, 0.2, 1] }}
        >
          <motion.span className="inline-block" animate={{ rotate: [0, 360] }} transition={{ duration: 4, delay: 1, repeat: Infinity, ease: "linear" }}>
            🔄
          </motion.span>
        </motion.div>
        <TitleBlock title="not perfect?" subtitle="run it again anytime — every new attempt costs one credit and gives fresh options" />
      </div>
    ),
    4: (
      <div className={sceneClass}>
        <CenterEmoji emoji="📸" size="text-[4.5rem]" delay={0.1} y="14%" />
        <TitleBlock title="create photos" subtitle="your character can turn into polished image sets with depth, variation, and style" />
        <div className="flex items-center justify-center gap-3">
          {[{ color: pink, emoji: "🌸", rot: -10 }, { color: blue1, emoji: "✨", rot: 0 }, { color: orange, emoji: "🔥", rot: 10 }].map((card, i) => (
            <motion.div
              key={i}
              className="relative flex items-center justify-center overflow-hidden rounded-[20px]"
              style={{ width: 86, height: 120, background: `${card.color}18`, border: `3px solid ${card.color}33` }}
              initial={{ opacity: 0, y: 20, rotate: card.rot, scale: 0.88 }}
              animate={{ opacity: 1, y: 0, rotate: [card.rot, card.rot + 2, card.rot - 1, card.rot], scale: 1 }}
              transition={{
                opacity: { duration: 0.28, delay: 0.5 + i * 0.1 },
                y: { duration: 0.28, delay: 0.5 + i * 0.1, ease: "backOut" },
                scale: { duration: 0.28, delay: 0.5 + i * 0.1, ease: "backOut" },
                rotate: { duration: 3.5, delay: 1 + i * 0.2, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              <span className="text-4xl">{card.emoji}</span>
            </motion.div>
          ))}
        </div>
      </div>
    ),
    5: (
      <div className={sceneClass}>
        <CenterEmoji emoji="✍️" size="text-[4.5rem]" delay={0.1} y="14%" />
        <TitleBlock title="describe what you want" subtitle="add prompt details like lighting, pose, setting, outfit, mood, or camera feel" />
        <motion.div
          className="w-full rounded-[20px] border-[4px] px-5 py-4"
          style={{ borderColor: `${blue1}33`, background: panel }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.6, ease: "easeOut" }}
        >
          <div className="mb-3 text-xs font-extrabold lowercase" style={{ color: textMuted }}>example prompt</div>
          <TypingLine text="golden hour portrait, soft dress, cafe mood" />
        </motion.div>
      </div>
    ),
    6: (
      <div className={sceneClass}>
        <ParticleBurst active={burst} />
        <CenterEmoji emoji="🚀" size="text-[5rem]" delay={0.1} y="16%" />
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

  const handleLetsGo = () => {
    setBurst(true);
    window.setTimeout(onDismiss, 600);
  };

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-end overflow-hidden pb-[8vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={step < TOTAL_STEPS - 1 ? advance : undefined}
          style={{ cursor: step < TOTAL_STEPS - 1 ? "pointer" : "default", background: overlay }}
        >
          <motion.div
            className="relative z-10 mx-4 flex w-full max-w-sm flex-col items-center"
            initial={{ y: 12, opacity: 0.96 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.24, ease: "easeOut" }}
          >
            <div className="flex min-h-[420px] w-full items-center justify-center px-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  className="w-full"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -18 }}
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
                  style={{ background: `linear-gradient(135deg, ${blue1}, ${blue2})`, color: white }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.22, delay: 0.15 }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    animate={{ boxShadow: [`0 0 0 0 ${blue1}44`, `0 0 0 12px ${blue1}00`, `0 0 0 0 ${blue1}00`] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <span className="relative z-10">let's go</span>
                </motion.button>
              ) : (
                <motion.div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl"
                  style={{ background: `linear-gradient(135deg, ${blue1}, ${blue2})` }}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.2, delay: 0.15 }}
                  aria-hidden
                >
                  <ArrowRight size={22} strokeWidth={2.5} style={{ color: white }} />
                </motion.div>
              )}

              {step < TOTAL_STEPS - 1 ? (
                <motion.p
                  className="text-xs font-extrabold lowercase"
                  style={{ color: textMuted }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.2, delay: 0.3 }}
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
