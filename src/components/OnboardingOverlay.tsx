import { forwardRef, useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

const TOTAL_STEPS = 7;
const AUTO_ADVANCE_MS = 5200;

const Blob = forwardRef<HTMLDivElement, { x: string; y: string; size: number; delay?: number; duration?: number }>(
  ({ x, y, size, delay = 0, duration = 7 }, ref) => (
    <motion.div
      ref={ref}
      className="absolute rounded-full pointer-events-none"
      style={{
        width: size,
        height: size,
        left: x,
        top: y,
        background: "hsl(0 0% 100% / 0.08)",
        filter: "blur(38px)",
      }}
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{
        opacity: [0.12, 0.28, 0.14],
        scale: [0.9, 1.06, 0.94],
        x: [0, 12, -10, 0],
        y: [0, -10, 8, 0],
      }}
      transition={{ duration, delay, repeat: Infinity, ease: "easeInOut" }}
    />
  ),
);
Blob.displayName = "Blob";

const FloatingEmoji = forwardRef<HTMLSpanElement, { emoji: string; x: string; y: string; delay?: number; size?: string }>(
  ({ emoji, x, y, delay = 0, size = "text-4xl" }, ref) => (
    <motion.span
      ref={ref}
      className={`absolute select-none pointer-events-none ${size}`}
      style={{ left: x, top: y }}
      initial={{ opacity: 0, scale: 0.6, y: 18 }}
      animate={{ opacity: 1, scale: [0.7, 1.08, 1], y: [18, -6, 0] }}
      transition={{ duration: 0.7, delay, ease: "backOut" }}
    >
      <motion.span
        className="inline-block"
        animate={{ y: [0, -5, 0], rotate: [0, 4, -4, 0] }}
        transition={{ duration: 2.8, delay: delay + 0.4, repeat: Infinity, ease: "easeInOut" }}
      >
        {emoji}
      </motion.span>
    </motion.span>
  ),
);
FloatingEmoji.displayName = "FloatingEmoji";

const TwinkleEmoji = ({ emoji, x, y, delay = 0 }: { emoji: string; x: string; y: string; delay?: number }) => (
  <motion.span
    className="absolute text-3xl select-none pointer-events-none"
    style={{ left: x, top: y }}
    initial={{ opacity: 0, scale: 0.5 }}
    animate={{ opacity: [0, 1, 0.35, 1, 0], scale: [0.6, 1.15, 0.85, 1, 0.7] }}
    transition={{ duration: 3, delay, repeat: Infinity, ease: "easeInOut" }}
  >
    {emoji}
  </motion.span>
);

const WobbleShape = ({ x, y, size, delay = 0 }: { x: string; y: string; size: number; delay?: number }) => (
  <motion.div
    className="absolute rounded-2xl pointer-events-none"
    style={{ left: x, top: y, width: size, height: size, background: "hsl(0 0% 100% / 0.08)" }}
    initial={{ opacity: 0, scale: 0.5, rotate: -8 }}
    animate={{ opacity: [0.14, 0.26, 0.16], scale: [0.85, 1, 0.9], rotate: [-8, 6, -4, -8] }}
    transition={{ duration: 4.6, delay, repeat: Infinity, ease: "easeInOut" }}
  />
);

const ProgressDots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center justify-center gap-2.5 pb-4">
    {Array.from({ length: total }).map((_, index) => (
      <motion.div
        key={`dot-${index}-${current}`}
        className="rounded-full"
        initial={false}
        animate={{
          width: index === current ? 30 : 10,
          height: 10,
          backgroundColor: index === current ? "hsl(0 0% 100%)" : "hsl(0 0% 100% / 0.16)",
        }}
        transition={{ duration: 0.24, ease: "easeOut" }}
      />
    ))}
  </div>
);

const ParticleBurst = ({ active }: { active: boolean }) => {
  if (!active) return null;

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {Array.from({ length: 22 }).map((_, index) => {
        const angle = (index / 22) * Math.PI * 2;
        const distance = 50 + ((index * 11) % 70);

        return (
          <motion.div
            key={index}
            className="absolute rounded-full"
            style={{
              left: "50%",
              top: "50%",
              width: 4,
              height: 4,
              background: index % 2 === 0 ? "hsl(0 0% 100%)" : "hsl(0 0% 100% / 0.45)",
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(angle) * distance,
              y: Math.sin(angle) * distance,
              opacity: 0,
              scale: 0,
            }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
};

const TypingText = ({ text, className }: { text: string; className?: string }) => {
  const [displayed, setDisplayed] = useState("");

  useEffect(() => {
    setDisplayed("");
    let index = 0;
    let intervalId: number | undefined;

    const startTimer = window.setTimeout(() => {
      intervalId = window.setInterval(() => {
        index += 1;
        setDisplayed(text.slice(0, index));
        if (index >= text.length && intervalId) {
          window.clearInterval(intervalId);
        }
      }, 42);
    }, 700);

    return () => {
      window.clearTimeout(startTimer);
      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, [text]);

  return (
    <span className={className}>
      {displayed}
      <motion.span
        className="ml-1 inline-block h-5 w-0.5 align-middle bg-white/45"
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.6, repeat: Infinity }}
      />
    </span>
  );
};

const PopEmoji = ({ emoji, delay }: { emoji: string; delay: number }) => (
  <motion.div
    className="flex h-12 w-12 items-center justify-center rounded-2xl border-[4px] border-white/10 bg-white/5 text-2xl"
    initial={{ opacity: 0, scale: 0.4, y: 18 }}
    animate={{ opacity: 1, scale: [0.4, 1.15, 1], y: 0 }}
    transition={{ duration: 0.45, delay, ease: "backOut" }}
  >
    {emoji}
  </motion.div>
);

const TitleBlock = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="relative z-10 flex flex-col items-center gap-3 text-center">
    <motion.h2
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="max-w-[11ch] text-5xl font-[900] lowercase tracking-tighter text-white"
    >
      {title}
    </motion.h2>
    {subtitle ? (
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.1, ease: "easeOut" }}
        className="max-w-xs text-lg font-extrabold lowercase text-white/42"
      >
        {subtitle}
      </motion.p>
    ) : null}
  </div>
);

const PhotoCard = ({ delay, rotation }: { delay: number; rotation: number }) => (
  <motion.div
    className="h-28 w-20 rounded-[20px] border-[4px] border-white/10 bg-white/5 shadow-soft"
    style={{ background: "linear-gradient(180deg, hsl(0 0% 100% / 0.10), hsl(0 0% 100% / 0.03))" }}
    initial={{ opacity: 0, y: 30, rotate: rotation, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, rotate: [rotation, rotation + 2, rotation - 1, rotation], scale: 1 }}
    transition={{
      opacity: { duration: 0.45, delay },
      y: { duration: 0.45, delay, ease: "backOut" },
      scale: { duration: 0.45, delay, ease: "backOut" },
      rotate: { duration: 4.2, delay: delay + 0.4, repeat: Infinity, ease: "easeInOut" },
    }}
  />
);

const StepContent = ({ step, burst }: { step: number; burst: boolean }) => {
  const steps: Record<number, React.ReactNode> = {
    0: (
      <div className="relative flex min-h-[400px] flex-col items-center justify-center gap-6 overflow-hidden">
        <Blob x="6%" y="8%" size={120} delay={0.1} />
        <Blob x="72%" y="70%" size={92} delay={0.6} />
        <WobbleShape x="80%" y="18%" size={24} delay={0.4} />
        <FloatingEmoji emoji="👋" x="10%" y="18%" delay={0.3} size="text-5xl" />
        <FloatingEmoji emoji="🌊" x="78%" y="22%" delay={0.6} size="text-4xl" />
        <TitleBlock title="welcome to vizura" subtitle="quick walkthrough — takes 30 seconds" />
      </div>
    ),
    1: (
      <div className="relative flex min-h-[400px] flex-col items-center justify-center gap-6 overflow-hidden">
        <Blob x="14%" y="14%" size={120} delay={0.2} />
        <TwinkleEmoji emoji="✨" x="12%" y="20%" delay={0.2} />
        <TwinkleEmoji emoji="✨" x="80%" y="18%" delay={0.7} />
        <TwinkleEmoji emoji="💫" x="74%" y="70%" delay={1.1} />
        <FloatingEmoji emoji="🫶" x="44%" y="14%" delay={0.4} size="text-5xl" />
        <TitleBlock title="make any character" subtitle="dream her up — we bring her to life" />
      </div>
    ),
    2: (
      <div className="relative flex min-h-[400px] flex-col items-center justify-center gap-6 overflow-hidden">
        <Blob x="70%" y="12%" size={106} delay={0.3} />
        <TitleBlock title="shape their look" subtitle="pick a few traits and build the vibe fast" />
        <div className="flex items-center justify-center gap-3">
          <PopEmoji emoji="💇" delay={0.4} />
          <PopEmoji emoji="👁️" delay={0.52} />
          <PopEmoji emoji="🧍" delay={0.64} />
        </div>
        <div className="flex flex-col gap-2.5 text-center">
          {[
            "hair colour",
            "eye colour",
            "body type",
          ].map((item, index) => (
            <motion.div
              key={item}
              className="rounded-2xl bg-white/5 px-5 py-3 text-base font-extrabold lowercase text-white/60"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.7 + index * 0.1, ease: "easeOut" }}
            >
              {item}
            </motion.div>
          ))}
        </div>
      </div>
    ),
    3: (
      <div className="relative flex min-h-[400px] flex-col items-center justify-center gap-6 overflow-hidden">
        <Blob x="18%" y="12%" size={118} delay={0.2} />
        <WobbleShape x="78%" y="20%" size={22} delay={0.5} />
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "backOut" }}
          className="text-5xl"
        >
          <motion.span
            className="inline-block"
            animate={{ rotate: 360 }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "linear" }}
          >
            🔄
          </motion.span>
        </motion.div>
        <TitleBlock title="not perfect?" subtitle="hit create again — each attempt costs 1 credit" />
      </div>
    ),
    4: (
      <div className="relative flex min-h-[400px] flex-col items-center justify-center gap-6 overflow-hidden">
        <Blob x="24%" y="10%" size={132} delay={0.2} />
        <FloatingEmoji emoji="📸" x="80%" y="18%" delay={0.5} size="text-4xl" />
        <TitleBlock title="create photos" subtitle="you get multiple polished options every time" />
        <div className="flex items-center justify-center gap-4">
          <PhotoCard delay={0.45} rotation={-9} />
          <PhotoCard delay={0.58} rotation={0} />
          <PhotoCard delay={0.7} rotation={9} />
        </div>
      </div>
    ),
    5: (
      <div className="relative flex min-h-[400px] flex-col items-center justify-center gap-6 overflow-hidden">
        <Blob x="10%" y="12%" size={118} delay={0.15} />
        <FloatingEmoji emoji="✍️" x="78%" y="18%" delay={0.4} size="text-4xl" />
        <TitleBlock title="describe what you want" subtitle="the more detail, the better" />
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.45, ease: "easeOut" }}
          className="w-full rounded-[24px] border-[4px] border-white/10 bg-white/5 px-5 py-4"
        >
          <div className="mb-3 text-xs font-extrabold lowercase text-white/25">example prompt</div>
          <TypingText text="golden hour portrait, soft dress, cafe mood" className="text-base font-extrabold lowercase text-white/58" />
        </motion.div>
      </div>
    ),
    6: (
      <div className="relative flex min-h-[400px] flex-col items-center justify-center gap-6 overflow-hidden">
        <ParticleBurst active={burst} />
        <Blob x="18%" y="12%" size={128} delay={0.15} duration={8} />
        <Blob x="68%" y="62%" size={104} delay={0.5} duration={7.5} />
        <FloatingEmoji emoji="✨" x="14%" y="22%" delay={0.45} size="text-4xl" />
        <FloatingEmoji emoji="🚀" x="80%" y="20%" delay={0.65} size="text-4xl" />
        <TitleBlock title="ready to create?" subtitle="sign up free — first creation on us" />
      </div>
    ),
  };

  return <>{steps[step]}</>;
};

const OnboardingOverlay = ({ open, onDismiss }: { open: boolean; onDismiss: () => void }) => {
  const [step, setStep] = useState(0);
  const [burst, setBurst] = useState(false);

  const advance = useCallback(() => {
    if (step < TOTAL_STEPS - 1) {
      setStep((currentStep) => currentStep + 1);
    }
  }, [step]);

  useEffect(() => {
    if (!open) {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      return;
    }

    setStep(0);
    setBurst(false);

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open || step >= TOTAL_STEPS - 1) return;

    const timer = window.setTimeout(advance, AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [advance, open, step]);

  const handleLetsGo = () => {
    setBurst(true);
    window.setTimeout(onDismiss, 700);
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={step < TOTAL_STEPS - 1 ? advance : undefined}
          style={{ cursor: step < TOTAL_STEPS - 1 ? "pointer" : "default" }}
        >
          <motion.div
            className="relative z-10 mx-4 flex w-full max-w-sm flex-col items-center"
            initial={{ y: 14, opacity: 0.96 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className="flex min-h-[430px] w-full items-center justify-center px-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  className="w-full"
                  initial={{ opacity: 0, x: 22 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -22 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  <StepContent step={step} burst={burst} />
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-2 flex w-full flex-col items-center gap-5">
              {step === TOTAL_STEPS - 1 ? (
                <motion.button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleLetsGo();
                  }}
                  className="relative h-14 w-full overflow-hidden rounded-2xl bg-white text-sm font-[900] lowercase tracking-tight text-black"
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35, delay: 0.18 }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    animate={{ boxShadow: ["0 0 0 0 hsl(39 63% 55% / 0.28)", "0 0 0 12px hsl(39 63% 55% / 0)", "0 0 0 0 hsl(39 63% 55% / 0)"] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                  <span className="relative z-10">let’s go</span>
                </motion.button>
              ) : (
                <motion.div
                  className="flex h-14 w-14 items-center justify-center rounded-2xl bg-black"
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                  aria-hidden
                >
                  <ArrowRight size={22} strokeWidth={2.5} className="text-white" />
                </motion.div>
              )}

              {step < TOTAL_STEPS - 1 ? (
                <motion.p
                  className="text-xs font-extrabold lowercase text-white/22"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.45 }}
                >
                  tap anywhere
                </motion.p>
              ) : null}

              <ProgressDots current={step} total={TOTAL_STEPS} />
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default OnboardingOverlay;