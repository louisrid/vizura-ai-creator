import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";

const TOTAL_STEPS = 7;
const AUTO_ADVANCE_MS = 5500;

/* ── floating blob ── */
const Blob = ({ x, y, size, color, delay = 0, duration = 6 }: { x: string; y: string; size: number; color: string; delay?: number; duration?: number }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{ width: size, height: size, background: color, left: x, top: y, filter: "blur(40px)" }}
    initial={{ opacity: 0, scale: 0.3 }}
    animate={{
      opacity: [0, 0.5, 0.3, 0.5, 0.3],
      scale: [0.3, 1, 0.85, 1.1, 0.9],
      x: [0, 15, -10, 8, 0],
      y: [0, -12, 8, -5, 0],
    }}
    transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
  />
);

/* ── bouncing emoji ── */
const BouncingEmoji = ({ emoji, x, y, delay = 0, size = "text-3xl" }: { emoji: string; x: string; y: string; delay?: number; size?: string }) => (
  <motion.span
    className={`absolute pointer-events-none select-none ${size}`}
    style={{ left: x, top: y }}
    initial={{ opacity: 0, scale: 0, y: 30 }}
    animate={{ opacity: 1, scale: [0, 1.2, 1], y: [30, -8, 0] }}
    transition={{ duration: 0.7, delay, ease: "backOut" }}
  >
    <motion.span
      className="inline-block"
      animate={{ y: [0, -6, 0], rotate: [0, 8, -8, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, delay: delay + 0.5, ease: "easeInOut" }}
    >
      {emoji}
    </motion.span>
  </motion.span>
);

/* ── wobbling shape ── */
const WobblingShape = ({ x, y, size, color, delay = 0, shape = "circle" }: { x: string; y: string; size: number; color: string; delay?: number; shape?: "circle" | "diamond" | "square" }) => (
  <motion.div
    className={`absolute pointer-events-none ${shape === "circle" ? "rounded-full" : shape === "diamond" ? "rotate-45 rounded-lg" : "rounded-lg"}`}
    style={{ left: x, top: y, width: size, height: size, background: color }}
    initial={{ opacity: 0, scale: 0, rotate: shape === "diamond" ? 45 : 0 }}
    animate={{ opacity: [0, 0.5, 0.3], scale: [0, 1, 0.9], rotate: shape === "diamond" ? [45, 55, 35, 45] : [0, 6, -6, 0] }}
    transition={{ duration: 4, delay, repeat: Infinity, ease: "easeInOut" }}
  />
);

/* ── twinkling sparkle emoji ── */
const TwinkleEmoji = ({ emoji, x, y, delay = 0 }: { emoji: string; x: string; y: string; delay?: number }) => (
  <motion.span
    className="absolute pointer-events-none select-none text-2xl"
    style={{ left: x, top: y }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: [0, 1, 0.3, 1, 0], scale: [0, 1.2, 0.8, 1.1, 0] }}
    transition={{ duration: 3, delay, repeat: Infinity, ease: "easeInOut" }}
  >
    {emoji}
  </motion.span>
);

/* ── progress dots ── */
const ProgressDots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex gap-2.5 justify-center pb-4">
    {Array.from({ length: total }).map((_, i) => (
      <motion.div
        key={`dot-${i}-${current}`}
        className="rounded-full"
        initial={false}
        animate={{
          width: i === current ? 28 : 10,
          height: 10,
          backgroundColor: i === current ? "hsl(0 0% 4%)" : "hsl(0 0% 4% / 0.12)",
        }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      />
    ))}
  </div>
);

/* ── particle burst on final screen ── */
const ParticleBurst = ({ active }: { active: boolean }) => {
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 30 }).map((_, i) => {
        const angle = (i / 30) * 360;
        const dist = 50 + Math.random() * 130;
        const rad = (angle * Math.PI) / 180;
        const colors = ["hsl(0 0% 4%)", "hsl(0 0% 30%)", "hsl(0 0% 60%)", "hsl(0 0% 15%)"];
        return (
          <motion.div
            key={i}
            className="absolute rounded-full"
            style={{
              left: "50%", top: "50%",
              width: 2 + Math.random() * 4, height: 2 + Math.random() * 4,
              background: colors[i % colors.length],
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, opacity: 0, scale: 0 }}
            transition={{ duration: 0.8 + Math.random() * 0.4, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
};

/* ── typing text with cursor ── */
const TypingText = ({ text, className }: { text: string; className?: string }) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const startTimer = setTimeout(() => {
      const iv = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(iv);
      }, 45);
    }, 800);
    return () => clearTimeout(startTimer);
  }, [text]);
  return (
    <span className={className}>
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="inline-block w-0.5 h-5 bg-foreground/40 ml-0.5 align-middle"
      />
    </span>
  );
};

/* ── pop-in emoji for step 2 ── */
const PopEmoji = ({ emoji, delay }: { emoji: string; delay: number }) => (
  <motion.div
    className="w-12 h-12 rounded-2xl bg-foreground/5 border-[4px] border-border/10 flex items-center justify-center text-2xl"
    initial={{ opacity: 0, scale: 0, y: 20 }}
    animate={{ opacity: 1, scale: [0, 1.3, 1], y: 0 }}
    transition={{ duration: 0.5, delay, ease: "backOut" }}
  >
    {emoji}
  </motion.div>
);

/* ── stagger + fade variants ── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.15, delayChildren: 0.3 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

/* ── tilt card for photo step ── */
const TiltCard = ({ delay = 0, gradient }: { delay?: number; gradient: string }) => (
  <motion.div
    className="w-20 h-28 rounded-xl border-[4px] border-border/10"
    style={{ background: gradient, transformStyle: "preserve-3d" }}
    initial={{ opacity: 0, x: delay < 0.15 ? -60 : delay > 0.25 ? 60 : 0, y: 40, rotateZ: delay < 0.15 ? -12 : delay > 0.25 ? 12 : 0 }}
    animate={{ opacity: 1, x: 0, y: 0, rotateZ: [0, 3, -3, 0], rotateY: [0, 8, -5, 3, 0] }}
    transition={{
      opacity: { duration: 0.5, delay: 0.6 + delay },
      x: { duration: 0.6, delay: 0.6 + delay, ease: "backOut" },
      y: { duration: 0.6, delay: 0.6 + delay, ease: "backOut" },
      rotateZ: { duration: 4, repeat: Infinity, delay: 1.5 + delay, ease: "easeInOut" },
      rotateY: { duration: 5, repeat: Infinity, delay: 1.5 + delay, ease: "easeInOut" },
    }}
  />
);

/* ── step content ── */
const StepContent = ({ step, burst }: { step: number; burst: boolean }) => {
  const content: Record<number, React.ReactNode> = {
    /* ── 0: welcome ── */
    0: (
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center justify-center gap-4 relative overflow-visible">
        <Blob x="5%" y="10%" size={100} color="hsl(0 0% 4% / 0.06)" delay={0.2} />
        <Blob x="75%" y="60%" size={80} color="hsl(0 0% 4% / 0.04)" delay={0.6} />
        <WobblingShape x="85%" y="15%" size={16} color="hsl(0 0% 4% / 0.08)" delay={0.4} shape="diamond" />
        <WobblingShape x="8%" y="70%" size={12} color="hsl(0 0% 4% / 0.06)" delay={0.8} shape="square" />
        <BouncingEmoji emoji="👋" x="15%" y="10%" delay={0.5} size="text-5xl" />
        <BouncingEmoji emoji="✨" x="78%" y="20%" delay={0.9} size="text-3xl" />
        <BouncingEmoji emoji="🌊" x="70%" y="75%" delay={1.2} size="text-3xl" />
        <motion.h2 variants={fadeUp} className="text-4xl font-[900] lowercase tracking-tighter text-foreground text-center relative z-10">
          welcome to vizura
        </motion.h2>
        <motion.p variants={fadeUp} className="text-base font-bold lowercase text-foreground/40 text-center relative z-10">
          quick walkthrough — 30 seconds
        </motion.p>
      </motion.div>
    ),

    /* ── 1: any character ── */
    1: (
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center justify-center gap-4 relative overflow-visible">
        <Blob x="20%" y="15%" size={90} color="hsl(0 0% 4% / 0.05)" delay={0.3} />
        <TwinkleEmoji emoji="✨" x="10%" y="10%" delay={0.3} />
        <TwinkleEmoji emoji="✨" x="82%" y="15%" delay={0.7} />
        <TwinkleEmoji emoji="💫" x="75%" y="65%" delay={1.1} />
        <TwinkleEmoji emoji="✨" x="15%" y="75%" delay={1.5} />
        <BouncingEmoji emoji="🧑‍🎨" x="50%" y="5%" delay={0.4} size="text-5xl" />
        <motion.h2 variants={fadeUp} className="text-4xl font-[900] lowercase tracking-tighter text-foreground text-center relative z-10 mt-8">
          make any character
        </motion.h2>
        <motion.p variants={fadeUp} className="text-base font-bold lowercase text-foreground/40 text-center relative z-10">
          dream her up — we'll bring her to life
        </motion.p>
      </motion.div>
    ),

    /* ── 2: controls ── */
    2: (
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center justify-center gap-4 relative">
        <Blob x="80%" y="10%" size={70} color="hsl(0 0% 4% / 0.04)" delay={0.2} />
        <motion.h2 variants={fadeUp} className="text-4xl font-[900] lowercase tracking-tighter text-foreground text-center">
          shape their look
        </motion.h2>
        <motion.div className="flex gap-3 justify-center mt-2">
          <PopEmoji emoji="💇" delay={0.5} />
          <PopEmoji emoji="👁️" delay={0.7} />
          <PopEmoji emoji="🌍" delay={0.9} />
          <PopEmoji emoji="✂️" delay={1.1} />
        </motion.div>
        <motion.div variants={fadeUp} className="w-full flex flex-col gap-2 mt-2">
          {[
            { emoji: "🌍", label: "ethnicity" },
            { emoji: "🎂", label: "age" },
            { emoji: "💇", label: "hair colour" },
            { emoji: "👁️", label: "eye colour" },
            { emoji: "🏋️", label: "body type" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              className="flex items-center gap-3 rounded-xl bg-foreground/[0.04] px-4 py-2.5"
              initial={{ opacity: 0, x: -20, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.6 + i * 0.12, ease: "backOut" }}
            >
              <span className="text-lg">{item.emoji}</span>
              <span className="text-sm font-[900] lowercase text-foreground/60">{item.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    ),

    /* ── 3: regenerate ── */
    3: (
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center justify-center gap-6 relative overflow-visible">
        <Blob x="30%" y="20%" size={90} color="hsl(0 0% 4% / 0.05)" delay={0.3} />
        <Blob x="70%" y="70%" size={70} color="hsl(0 0% 4% / 0.04)" delay={0.7} />
        <WobblingShape x="80%" y="25%" size={14} color="hsl(0 0% 4% / 0.06)" delay={0.5} shape="circle" />
        <motion.div
          className="text-5xl"
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.5, ease: "backOut" }}
        >
          <motion.span
            className="inline-block"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          >
            🔄
          </motion.span>
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-4xl font-[900] lowercase tracking-tighter text-foreground text-center">
          not perfect?
        </motion.h2>
        <motion.p variants={fadeUp} className="text-base font-bold lowercase text-foreground/40 text-center">
          hit create again — each attempt costs 1 credit
        </motion.p>
      </motion.div>
    ),

    /* ── 4: photos ── */
    4: (
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center justify-center gap-5 relative overflow-visible">
        <Blob x="50%" y="20%" size={100} color="hsl(0 0% 4% / 0.04)" delay={0.2} />
        <BouncingEmoji emoji="📸" x="80%" y="10%" delay={0.5} size="text-3xl" />
        <motion.span className="text-5xl" variants={fadeUp}>🖼️</motion.span>
        <motion.h2 variants={fadeUp} className="text-4xl font-[900] lowercase tracking-tighter text-foreground text-center">
          create photos
        </motion.h2>
        <motion.div className="flex gap-5 mt-2" style={{ perspective: 800 }}>
          <TiltCard delay={0} gradient="hsl(0 0% 4% / 0.06)" />
          <TiltCard delay={0.15} gradient="hsl(0 0% 4% / 0.04)" />
          <TiltCard delay={0.3} gradient="hsl(0 0% 4% / 0.06)" />
        </motion.div>
      </motion.div>
    ),

    /* ── 5: prompt ── */
    5: (
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center justify-center gap-5 relative overflow-visible">
        <Blob x="15%" y="25%" size={80} color="hsl(0 0% 4% / 0.04)" delay={0.3} />
        <WobblingShape x="85%" y="70%" size={10} color="hsl(0 0% 4% / 0.06)" delay={0.6} shape="diamond" />
        <motion.span className="text-5xl" variants={fadeUp}>✍️</motion.span>
        <motion.h2 variants={fadeUp} className="text-4xl font-[900] lowercase tracking-tighter text-foreground text-center">
          describe what you want
        </motion.h2>
        <motion.div
          variants={fadeUp}
          className="w-full rounded-2xl border-[4px] border-border/15 bg-foreground/[0.03] px-4 py-4 min-h-[80px] relative"
        >
          <motion.div
            className="absolute top-2.5 left-4 text-xs font-bold lowercase text-foreground/20"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
          >
            describe your character
          </motion.div>
          <div className="mt-5">
            <TypingText
              text="sitting in a cafe, golden hour, sundress"
              className="text-base font-bold lowercase text-foreground/50"
            />
          </div>
        </motion.div>
        <motion.p variants={fadeUp} className="text-sm font-bold lowercase text-foreground/30 text-center">
          the more detail, the better
        </motion.p>
      </motion.div>
    ),

    /* ── 6: final CTA ── */
    6: (
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center justify-center gap-6 relative overflow-visible">
        <ParticleBurst active={burst} />
        <Blob x="30%" y="20%" size={120} color="hsl(0 0% 4% / 0.04)" delay={0.2} duration={8} />
        <Blob x="70%" y="60%" size={90} color="hsl(0 0% 4% / 0.03)" delay={0.5} duration={7} />
        <BouncingEmoji emoji="🚀" x="80%" y="10%" delay={0.6} size="text-4xl" />
        <BouncingEmoji emoji="⚡" x="15%" y="70%" delay={1} size="text-3xl" />
        <motion.h2 variants={fadeUp} className="text-5xl font-[900] lowercase tracking-tighter text-foreground text-center relative z-10">
          ready to create?
        </motion.h2>
        <motion.p variants={fadeUp} className="text-lg font-bold lowercase text-foreground/40 text-center relative z-10">
          sign up free — first creation on us
        </motion.p>
      </motion.div>
    ),
  };
  return <>{content[step]}</>;
};

/* ── main overlay ── */
const OnboardingOverlay = ({ open, onDismiss }: { open: boolean; onDismiss: () => void }) => {
  const [step, setStep] = useState(0);
  const [burst, setBurst] = useState(false);

  const advance = useCallback(() => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
  }, [step]);

  useEffect(() => {
    if (open) { setStep(0); setBurst(false); }
  }, [open]);

  useEffect(() => {
    if (!open || step >= TOTAL_STEPS - 1) return;
    const timer = setTimeout(advance, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [open, step, advance]);

  const handleLetsGo = () => {
    setBurst(true);
    setTimeout(onDismiss, 800);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center touch-manipulation select-none bg-background"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={step < TOTAL_STEPS - 1 ? advance : undefined}
          style={{ cursor: step < TOTAL_STEPS - 1 ? "pointer" : "default" }}
        >
          {/* content */}
          <motion.div
            className="relative z-10 w-full max-w-sm mx-4 flex flex-col items-center"
            initial={{ y: 16 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            {/* step content */}
            <div className="w-full min-h-[380px] flex items-center justify-center px-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  transition={{ duration: 0.3 }}
                  className="w-full"
                >
                  <StepContent step={step} burst={burst} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* bottom controls */}
            <div className="mt-6 flex flex-col items-center gap-5 w-full">
              {step === TOTAL_STEPS - 1 ? (
                <motion.button
                  onClick={(e) => { e.stopPropagation(); handleLetsGo(); }}
                  className="relative h-14 w-full rounded-2xl bg-foreground text-background text-sm font-[900] lowercase tracking-tight overflow-hidden"
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <span className="relative z-10">let's go</span>
                </motion.button>
              ) : (
                <motion.div
                  className="flex items-center justify-center w-14 h-14 rounded-2xl bg-foreground"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.5 }}
                  aria-hidden
                >
                  <ArrowRight size={22} strokeWidth={2.5} className="text-background" />
                </motion.div>
              )}

              {step < TOTAL_STEPS - 1 && (
                <motion.p
                  className="text-[10px] font-bold lowercase text-foreground/20"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2 }}
                >
                  tap anywhere
                </motion.p>
              )}

              <ProgressDots current={step} total={TOTAL_STEPS} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default OnboardingOverlay;
