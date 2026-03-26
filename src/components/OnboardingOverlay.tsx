import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RefreshCw, Camera, Sparkles, Type, Wand2 } from "lucide-react";

const TOTAL_STEPS = 7;

/* ── soft glow dot — subtle ambient accent ── */
const Glow = ({ color, x, y, size = 120 }: { color: string; x: string; y: string; size?: number }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={{
      width: size,
      height: size,
      background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
      left: x,
      top: y,
      transform: "translate(-50%, -50%)",
    }}
    initial={{ opacity: 0, scale: 0.6 }}
    animate={{ opacity: 0.4, scale: 1 }}
    transition={{ duration: 1.8, delay: 0.8, ease: "easeOut" as const }}
  />
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
          backgroundColor: i === current ? "#d4a843" : "rgba(255,255,255,0.15)",
        }}
        transition={{ duration: 0.3, ease: "easeOut" as const }}
      />
    ))}
  </div>
);

/* ── particle burst on final screen ── */
const ParticleBurst = ({ active }: { active: boolean }) => {
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => {
        const angle = (i / 20) * 360;
        const dist = 60 + Math.random() * 100;
        const rad = (angle * Math.PI) / 180;
        return (
          <motion.div
            key={i}
            className="absolute w-1.5 h-1.5 rounded-full"
            style={{
              left: "50%",
              top: "50%",
              background: i % 2 === 0 ? "#d4a843" : "#7c9cf5",
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ x: Math.cos(rad) * dist, y: Math.sin(rad) * dist, opacity: 0, scale: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" as const }}
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
    // start typing after a comfortable delay
    const startTimer = setTimeout(() => {
      const iv = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) clearInterval(iv);
      }, 50);
    }, 1200);
    return () => clearTimeout(startTimer);
  }, [text]);
  return (
    <span className={className}>
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.6, repeat: Infinity }}
        className="inline-block w-0.5 h-4 bg-white/50 ml-0.5 align-middle"
      />
    </span>
  );
};

/* ── icon wrapper — minimal, mature ── */
const IconBlock = ({ children, delay = 0.6 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/10 border border-white/10"
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.5, delay, ease: "easeOut" as const }}
  >
    {children}
  </motion.div>
);

/* ── tilt card for photo step ── */
const TiltCard = ({ delay = 0, color }: { delay?: number; color: string }) => (
  <motion.div
    className="w-16 h-24 rounded-xl"
    style={{ background: color, transformStyle: "preserve-3d" }}
    initial={{ opacity: 0, y: 20, rotateY: -20 }}
    animate={{ opacity: 1, y: 0, rotateY: [0, 6, -4, 3, 0], rotateX: [0, -3, 2, -1, 0] }}
    transition={{
      opacity: { duration: 0.5, delay: 0.8 + delay },
      y: { duration: 0.5, delay: 0.8 + delay },
      rotateY: { duration: 6, repeat: Infinity, delay: 1.5 + delay, ease: "easeInOut" as const },
      rotateX: { duration: 7, repeat: Infinity, delay: 1.5 + delay, ease: "easeInOut" as const },
    }}
  />
);

/* ── stagger + fade variants — generous initial delay ── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.18, delayChildren: 0.4 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" as const } },
};

/* ── step content ── */
const StepContent = ({ step, burst }: { step: number; burst: boolean }) => {
  const content: Record<number, React.ReactNode> = {
    /* ── welcome ── */
    0: (
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center gap-6 relative">
        <Glow color="rgba(255,255,255,0.06)" x="30%" y="20%" />
        <Glow color="rgba(255,255,255,0.04)" x="70%" y="70%" size={100} />
        <motion.div variants={fadeUp}>
          <IconBlock delay={0.5}>
            <Wand2 size={24} strokeWidth={2} className="text-white/70" />
          </IconBlock>
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-3xl font-[900] lowercase tracking-tighter text-white text-center">
          vizura how-to
        </motion.h2>
        <motion.p variants={fadeUp} className="text-sm font-bold lowercase text-white/40 text-center">
          quick walkthrough — takes 30 seconds
        </motion.p>
      </motion.div>
    ),

    /* ── any character ── */
    1: (
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center gap-6 relative">
        <Glow color="rgba(255,255,255,0.04)" x="25%" y="30%" size={90} />
        <motion.div variants={fadeUp}>
          <IconBlock delay={0.5}>
            <Sparkles size={24} strokeWidth={2} className="text-white/70" />
          </IconBlock>
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-3xl font-[900] lowercase tracking-tighter text-white text-center">
          make any character you want
        </motion.h2>
        <motion.p variants={fadeUp} className="text-sm font-bold lowercase text-white/40 text-center">
          dream her up — we'll bring her to life
        </motion.p>
      </motion.div>
    ),

    /* ── controls ── */
    2: (
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center gap-5 relative">
        <motion.h2 variants={fadeUp} className="text-2xl font-[900] lowercase tracking-tighter text-white text-center">
          shape their look
        </motion.h2>
        <motion.div variants={fadeUp} className="w-full flex flex-col gap-2.5 mt-1">
          {[
            { label: "ethnicity", desc: "pick where she's from" },
            { label: "age", desc: "18 to 40" },
            { label: "hair", desc: "blonde, brunette, red…" },
            { label: "eyes", desc: "brown, blue, green…" },
            { label: "body", desc: "slim, regular, curvy" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              className="flex items-center gap-3 rounded-xl bg-white/[0.06] px-4 py-2.5"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.7 + i * 0.12, ease: "easeOut" as const }}
            >
              <span className="text-xs font-[900] lowercase text-white/70 w-14">{item.label}</span>
              <span className="text-xs font-bold lowercase text-white/30">{item.desc}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    ),

    /* ── regenerate ── */
    3: (
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center gap-6 relative">
        <Glow color="rgba(255,255,255,0.06)" x="60%" y="25%" size={100} />
        <motion.div variants={fadeUp}>
          <IconBlock delay={0.5}>
            <RefreshCw size={24} strokeWidth={2} className="text-white/70" />
          </IconBlock>
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-3xl font-[900] lowercase tracking-tighter text-white text-center">
          not perfect? regenerate
        </motion.h2>
        <motion.p variants={fadeUp} className="text-sm font-bold lowercase text-white/40 text-center">
          hit create again — each attempt costs 1 credit
        </motion.p>
      </motion.div>
    ),

    /* ── photos ── */
    4: (
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center gap-6 relative">
        <Glow color="rgba(255,255,255,0.04)" x="40%" y="60%" size={90} />
        <motion.div variants={fadeUp}>
          <IconBlock delay={0.5}>
            <Camera size={24} strokeWidth={2} className="text-white/70" />
          </IconBlock>
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-3xl font-[900] lowercase tracking-tighter text-white text-center">
          create photos of them
        </motion.h2>
        <motion.div variants={fadeUp} className="flex gap-4 mt-2" style={{ perspective: 600 }}>
          <TiltCard delay={0} color="rgba(255,255,255,0.06)" />
          <TiltCard delay={0.12} color="rgba(255,255,255,0.12)" />
          <TiltCard delay={0.24} color="rgba(255,255,255,0.06)" />
        </motion.div>
      </motion.div>
    ),

    /* ── prompt ── */
    5: (
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center gap-5 relative">
        <Glow color="rgba(255,255,255,0.05)" x="70%" y="30%" size={80} />
        <motion.div variants={fadeUp}>
          <IconBlock delay={0.5}>
            <Type size={24} strokeWidth={2} className="text-white/70" />
          </IconBlock>
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-2xl font-[900] lowercase tracking-tighter text-white text-center">
          describe what you want
        </motion.h2>
        <motion.div variants={fadeUp} className="w-full rounded-2xl border-[4px] border-white/15 bg-white/5 px-4 py-3 min-h-[72px]">
          <TypingText
            text="sitting in a cafe, golden hour lighting"
            className="text-sm font-bold lowercase text-white/60"
          />
        </motion.div>
        <motion.p variants={fadeUp} className="text-xs font-bold lowercase text-white/30 text-center">
          the more detail, the better
        </motion.p>
      </motion.div>
    ),

    /* ── final CTA ── */
    6: (
      <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-col items-center gap-7 relative">
        <ParticleBurst active={burst} />
        <Glow color="rgba(255,255,255,0.04)" x="50%" y="30%" size={160} />
        <motion.h2 variants={fadeUp} className="text-4xl font-[900] lowercase tracking-tighter text-white text-center">
          ready to create?
        </motion.h2>
        <motion.p variants={fadeUp} className="text-sm font-bold lowercase text-white/40 text-center">
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

  // reset on open
  useEffect(() => {
    if (open) { setStep(0); setBurst(false); }
  }, [open]);

  const handleLetsGo = () => {
    setBurst(true);
    setTimeout(onDismiss, 800);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center touch-manipulation select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          onClick={step < TOTAL_STEPS - 1 ? advance : undefined}
          style={{ cursor: step < TOTAL_STEPS - 1 ? "pointer" : "default" }}
        >
          {/* backdrop — 95% dark */}
          <div className="absolute inset-0 bg-foreground/95" />

          {/* content */}
          <motion.div
            className="relative z-10 w-full max-w-sm mx-4 flex flex-col items-center"
            initial={{ y: 16 }}
            animate={{ y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" as const }}
          >
            {/* step content */}
            <div className="w-full min-h-[340px] flex items-center justify-center px-4">
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
                  className="relative h-14 w-full rounded-2xl text-sm font-[900] lowercase tracking-tight overflow-hidden"
                  style={{ background: "#d4a843", color: "#1a1a1a" }}
                  whileTap={{ scale: 0.97 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6, duration: 0.5 }}
                >
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    animate={{ boxShadow: ["0 0 20px 0px #d4a84355", "0 0 35px 6px #d4a84377", "0 0 20px 0px #d4a84355"] }}
                    transition={{ duration: 2.5, repeat: Infinity }}
                  />
                  <span className="relative z-10">let's go</span>
                </motion.button>
              ) : (
                <motion.div
                  className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/15 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.2, duration: 0.5 }}
                  aria-hidden
                >
                  <ArrowRight size={20} strokeWidth={2.5} className="text-white/60" />
                </motion.div>
              )}

              {step < TOTAL_STEPS - 1 && (
                <motion.p
                  className="text-[10px] font-bold lowercase text-white/20"
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
