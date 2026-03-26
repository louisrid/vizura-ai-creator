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
const overlay = "hsl(0 0% 0% / 0.99)";

/* vizura palette */
const blue1 = "hsl(210 100% 65%)";
const blue2 = "hsl(230 85% 55%)";
const pink = "hsl(330 80% 60%)";
const orange = "hsl(25 95% 58%)";
const yellow = "hsl(45 95% 58%)";
const green = "hsl(155 70% 45%)";
const red = "hsl(0 80% 58%)";

/* ── abstract shape components ── */

const Splodge = ({ x, y, w, h, delay = 0, rotate = 0, color = blue1 }: { x: string; y: string; w: number; h: number; delay?: number; rotate?: number; color?: string }) => (
  <motion.div
    className="pointer-events-none absolute"
    style={{ left: x, top: y, width: w, height: h, borderRadius: "50% 50% 50% 50%", background: color, opacity: 0.15, rotate, filter: "blur(8px)" }}
    initial={{ opacity: 0, scale: 0.3 }}
    animate={{ opacity: 0.18, scale: [0.3, 1.06, 1] }}
    transition={{ duration: 0.6, delay: delay + 0.4, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <motion.div
      className="h-full w-full"
      style={{ borderRadius: "inherit", background: "inherit" }}
      animate={{ scale: [1, 1.08, 0.95, 1] }}
      transition={{ duration: 6, delay: delay + 1, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

const Ring = ({ x, y, size, delay = 0, color = blue2, strokeWidth = 4 }: { x: string; y: string; size: number; delay?: number; color?: string; strokeWidth?: number }) => (
  <motion.div
    className="pointer-events-none absolute rounded-full"
    style={{ left: x, top: y, width: size, height: size, border: `${strokeWidth}px solid ${color}`, opacity: 0.25 }}
    initial={{ opacity: 0, scale: 0.2 }}
    animate={{ opacity: 0.25, scale: [0.2, 1.08, 1] }}
    transition={{ duration: 0.55, delay: delay + 0.4, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <motion.div
      className="h-full w-full"
      animate={{ rotate: [0, 360] }}
      transition={{ duration: 16, delay: delay + 1, repeat: Infinity, ease: "linear" }}
    />
  </motion.div>
);

const Dot = ({ x, y, size, delay = 0, color = pink }: { x: string; y: string; size: number; delay?: number; color?: string }) => (
  <motion.div
    className="pointer-events-none absolute rounded-full"
    style={{ left: x, top: y, width: size, height: size, background: color, opacity: 0.35 }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 0.35, scale: [0, 1.2, 1] }}
    transition={{ duration: 0.4, delay: delay + 0.4, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <motion.div
      className="h-full w-full rounded-full"
      animate={{ scale: [1, 1.15, 0.92, 1] }}
      transition={{ duration: 4, delay: delay + 1, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

const CrossMark = ({ x, y, size, delay = 0, color = orange }: { x: string; y: string; size: number; delay?: number; color?: string }) => (
  <motion.div
    className="pointer-events-none absolute"
    style={{ left: x, top: y, width: size, height: size, opacity: 0.3 }}
    initial={{ opacity: 0, scale: 0.3, rotate: -45 }}
    animate={{ opacity: 0.3, scale: 1, rotate: 0 }}
    transition={{ duration: 0.5, delay: delay + 0.4, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <motion.div
      className="relative h-full w-full"
      animate={{ rotate: [0, 90] }}
      transition={{ duration: 8, delay: delay + 1, repeat: Infinity, ease: "linear" }}
    >
      <div className="absolute left-1/2 top-0 h-full w-[4px] -translate-x-1/2 rounded-full" style={{ background: color }} />
      <div className="absolute left-0 top-1/2 h-[4px] w-full -translate-y-1/2 rounded-full" style={{ background: color }} />
    </motion.div>
  </motion.div>
);

/* ── gradient blob — vizura blue ── */
const GradientBlob = ({ x, y, w, h, delay = 0, rotate = 0, colors = [blue1, blue2] }: { x: string; y: string; w: number; h: number; delay?: number; rotate?: number; colors?: string[] }) => (
  <motion.div
    className="pointer-events-none absolute"
    style={{
      left: x, top: y, width: w, height: h,
      borderRadius: "50%",
      background: `linear-gradient(135deg, ${colors[0]}, ${colors[1] || colors[0]})`,
      opacity: 0.18, rotate, filter: "blur(12px)",
    }}
    initial={{ opacity: 0, scale: 0.2 }}
    animate={{ opacity: 0.22, scale: [0.2, 1.1, 1] }}
    transition={{ duration: 0.65, delay: delay + 0.4, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <motion.div
      className="h-full w-full"
      style={{ borderRadius: "inherit", background: "inherit" }}
      animate={{ scale: [1, 1.12, 0.94, 1] }}
      transition={{ duration: 5, delay: delay + 1, repeat: Infinity, ease: "easeInOut" }}
    />
  </motion.div>
);

/* ── single centered emoji ── */
const CenterEmoji = ({ emoji, size = "text-[4.5rem]", delay = 0, y = "36%" }: { emoji: string; size?: string; delay?: number; y?: string }) => (
  <motion.div
    className="pointer-events-none absolute left-1/2 select-none"
    style={{ top: y, transform: "translateX(-50%)" }}
    initial={{ opacity: 0, scale: 0.3, y: 30, filter: "blur(6px)" }}
    animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)", x: "-50%" }}
    transition={{ duration: 0.5, delay: delay + 0.5, ease: [0.2, 0.9, 0.2, 1] }}
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
const EmojiRow = ({ emojis, delay = 0, y = "32%", size = "text-[3.5rem]", gap = 12 }: { emojis: string[]; delay?: number; y?: string; size?: string; gap?: number }) => (
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
  const sceneClass = "relative flex min-h-[420px] flex-col items-center justify-center gap-4 overflow-hidden";

  const scenes: Record<number, React.ReactNode> = {
    /* ── 0: welcome ── */
    0: (
      <div className={sceneClass}>
        <GradientBlob x="2%" y="6%" w={130} h={110} delay={0} rotate={-12} colors={[blue1, blue2]} />
        <Splodge x="68%" y="56%" w={100} h={85} delay={0.15} rotate={20} color={pink} />
        <Ring x="72%" y="10%" size={56} delay={0.1} color={orange} />
        <Dot x="18%" y="60%" size={16} delay={0.2} color={yellow} />
        <Dot x="84%" y="52%" size={10} delay={0.3} color={green} />
        <CrossMark x="60%" y="62%" size={22} delay={0.35} color={blue1} />
        <CenterEmoji emoji="👋" size="text-[5rem]" delay={0.1} y="30%" />
        <TitleBlock title="welcome to vizura" subtitle="quick walkthrough so you instantly get how character creation works" />
      </div>
    ),
    /* ── 1: make any character ── */
    1: (
      <div className={sceneClass}>
        <GradientBlob x="6%" y="12%" w={120} h={100} delay={0} rotate={10} colors={[pink, orange]} />
        <Splodge x="66%" y="8%" w={90} h={80} delay={0.1} rotate={-8} color={blue1} />
        <Ring x="74%" y="8%" size={48} delay={0.1} color={yellow} />
        <Ring x="14%" y="56%" size={34} delay={0.25} color={green} />
        <Dot x="82%" y="54%" size={12} delay={0.2} color={red} />
        <CrossMark x="24%" y="12%" size={20} delay={0.3} color={pink} />
        <Dot x="66%" y="60%" size={8} delay={0.35} color={blue2} />
        <CenterEmoji emoji="🫶" size="text-[5.5rem]" delay={0.1} y="28%" />
        <TitleBlock title="make any character" subtitle="start with a vibe, a face, a mood, or a whole fantasy and build from there" />
      </div>
    ),
    /* ── 2: shape their look ── */
    2: (
      <div className={sceneClass}>
        <GradientBlob x="60%" y="4%" w={120} h={95} delay={0} rotate={-8} colors={[blue2, green]} />
        <Splodge x="2%" y="48%" w={90} h={75} delay={0.1} rotate={15} color={orange} />
        <Ring x="78%" y="52%" size={42} delay={0.15} color={pink} />
        <Dot x="14%" y="16%" size={14} delay={0.1} color={yellow} />
        <CrossMark x="82%" y="14%" size={18} delay={0.25} color={red} />
        <Dot x="6%" y="38%" size={8} delay={0.3} color={blue1} />
        <EmojiRow emojis={["💇", "👁️", "🧍"]} delay={0.1} y="28%" size="text-[3.8rem]" gap={16} />
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
    /* ── 3: not perfect? ── */
    3: (
      <div className={sceneClass}>
        <GradientBlob x="4%" y="8%" w={110} h={95} delay={0} rotate={-6} colors={[orange, yellow]} />
        <Splodge x="66%" y="52%" w={95} h={80} delay={0.1} rotate={12} color={blue1} />
        <Ring x="76%" y="12%" size={52} delay={0.1} color={pink} />
        <Ring x="16%" y="54%" size={38} delay={0.2} color={green} />
        <Dot x="80%" y="56%" size={14} delay={0.25} color={red} />
        <CrossMark x="8%" y="14%" size={20} delay={0.15} color={yellow} />
        <Dot x="68%" y="44%" size={8} delay={0.35} color={blue2} />
        <motion.div
          className="text-[5.5rem]"
          initial={{ opacity: 0, scale: 0.3, y: 16, rotate: -30 }}
          animate={{ opacity: 1, scale: 1, y: 0, rotate: 0 }}
          transition={{ duration: 0.5, delay: 0.6, ease: [0.2, 0.9, 0.2, 1] }}
        >
          <motion.span className="inline-block" animate={{ rotate: [0, 360] }} transition={{ duration: 4, delay: 1.2, repeat: Infinity, ease: "linear" }}>
            🔄
          </motion.span>
        </motion.div>
        <TitleBlock title="not perfect?" subtitle="run it again anytime — every new attempt costs one credit and gives fresh options" />
      </div>
    ),
    /* ── 4: create photos ── */
    4: (
      <div className={sceneClass}>
        <GradientBlob x="8%" y="6%" w={115} h={90} delay={0} rotate={12} colors={[blue1, pink]} />
        <Splodge x="66%" y="50%" w={85} h={72} delay={0.1} rotate={-10} color={green} />
        <Ring x="80%" y="8%" size={44} delay={0.12} color={orange} />
        <Dot x="8%" y="52%" size={12} delay={0.18} color={yellow} />
        <Dot x="86%" y="48%" size={10} delay={0.25} color={red} />
        <CrossMark x="4%" y="16%" size={18} delay={0.2} color={blue2} />
        <CenterEmoji emoji="📸" size="text-[4.5rem]" delay={0.1} y="26%" />
        <TitleBlock title="create photos" subtitle="your character can turn into polished image sets with depth, variation, and style" />
        <div className="flex items-center justify-center gap-3">
          {[{ color: pink, emoji: "🌸", rot: -10 }, { color: blue1, emoji: "✨", rot: 0 }, { color: orange, emoji: "🔥", rot: 10 }].map((card, i) => (
            <motion.div
              key={i}
              className="relative flex items-center justify-center overflow-hidden rounded-[20px]"
              style={{ width: 90, height: 128, background: `linear-gradient(160deg, ${card.color}33, ${card.color}11)`, border: `3px solid ${card.color}44` }}
              initial={{ opacity: 0, y: 24, rotate: card.rot, scale: 0.86 }}
              animate={{ opacity: 1, y: 0, rotate: [card.rot, card.rot + 2, card.rot - 1, card.rot], scale: 1 }}
              transition={{
                opacity: { duration: 0.3, delay: 0.6 + i * 0.1 },
                y: { duration: 0.3, delay: 0.6 + i * 0.1, ease: "backOut" },
                scale: { duration: 0.3, delay: 0.6 + i * 0.1, ease: "backOut" },
                rotate: { duration: 3.5, delay: 1 + i * 0.2, repeat: Infinity, ease: "easeInOut" },
              }}
            >
              <span className="text-4xl">{card.emoji}</span>
            </motion.div>
          ))}
        </div>
      </div>
    ),
    /* ── 5: describe what you want ── */
    5: (
      <div className={sceneClass}>
        <GradientBlob x="62%" y="6%" w={110} h={88} delay={0} rotate={-14} colors={[green, blue1]} />
        <Splodge x="4%" y="50%" w={85} h={72} delay={0.1} rotate={10} color={yellow} />
        <Ring x="14%" y="10%" size={40} delay={0.08} color={pink} />
        <Dot x="82%" y="50%" size={12} delay={0.2} color={orange} />
        <CrossMark x="80%" y="16%" size={20} delay={0.25} color={red} />
        <CenterEmoji emoji="✍️" size="text-[4.5rem]" delay={0.1} y="28%" />
        <TitleBlock title="describe what you want" subtitle="add prompt details like lighting, pose, setting, outfit, mood, or camera feel" />
        <motion.div
          className="w-full rounded-[20px] border-[4px] px-5 py-4"
          style={{ borderColor: `${blue1}33`, background: panel }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28, delay: 0.65, ease: "easeOut" }}
        >
          <div className="mb-3 text-xs font-extrabold lowercase" style={{ color: textMuted }}>example prompt</div>
          <TypingLine text="golden hour portrait, soft dress, cafe mood" />
        </motion.div>
      </div>
    ),
    /* ── 6: ready to create? ── */
    6: (
      <div className={sceneClass}>
        <ParticleBurst active={burst} />
        <GradientBlob x="4%" y="8%" w={120} h={100} delay={0} rotate={-10} colors={[blue1, blue2]} />
        <GradientBlob x="62%" y="50%" w={100} h={85} delay={0.15} rotate={16} colors={[pink, orange]} />
        <Ring x="78%" y="10%" size={50} delay={0.08} color={yellow} />
        <Ring x="10%" y="54%" size={36} delay={0.22} color={green} />
        <Dot x="22%" y="14%" size={16} delay={0.12} color={red} />
        <Dot x="82%" y="48%" size={10} delay={0.28} color={blue1} />
        <CrossMark x="68%" y="58%" size={22} delay={0.32} color={orange} />
        <CenterEmoji emoji="🚀" size="text-[5rem]" delay={0.1} y="28%" />
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
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-end pb-[8vh]"
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
