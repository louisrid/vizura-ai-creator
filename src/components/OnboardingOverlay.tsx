import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, RefreshCw, Camera } from "lucide-react";

const AUTO_ADVANCE_MS = 6000;
const TOTAL_STEPS = 7;

/* ── floating blob ── */
const Blob = ({
  size = 80,
  color = "hsl(var(--accent-purple))",
  x = 0,
  y = 0,
  delay = 0,
}: {
  size?: number;
  color?: string;
  x?: number;
  y?: number;
  delay?: number;
}) => (
  <motion.div
    className="absolute rounded-full pointer-events-none blur-2xl opacity-30"
    style={{ width: size, height: size, background: color, left: x, top: y }}
    animate={{
      x: [0, 20, -15, 10, 0],
      y: [0, -18, 12, -8, 0],
      scale: [1, 1.15, 0.92, 1.08, 1],
    }}
    transition={{ duration: 6, repeat: Infinity, delay, ease: "easeInOut" }}
  />
);

/* ── morphing blob between steps ── */
const MorphBlob = ({ step }: { step: number }) => {
  const paths = [
    "M44,-51.3C56.4,-42.2,65.5,-27.4,68.1,-11.3C70.7,4.8,66.8,22.1,57.2,34.7C47.6,47.4,32.3,55.3,15.7,59.7C-0.9,64.1,-18.8,65,-34.5,58.6C-50.2,52.2,-63.7,38.5,-69.2,22.1C-74.7,5.7,-72.2,-13.4,-63.1,-27.5C-54,-41.6,-38.3,-50.6,-23.1,-58.7C-7.9,-66.8,6.8,-74,20.5,-71C34.2,-68,31.6,-60.3,44,-51.3Z",
    "M39.5,-47.1C51.9,-38.5,63.1,-26.3,66.4,-12C69.7,2.3,65.2,18.7,56.3,31.3C47.4,43.9,34.2,52.8,19.3,57.9C4.4,63,-12.2,64.4,-26.8,59C-41.4,53.6,-54,41.5,-61.2,26.6C-68.4,11.7,-70.2,-5.9,-64.8,-20.3C-59.4,-34.7,-46.8,-45.9,-33.5,-54.2C-20.2,-62.5,-6.1,-67.8,5.4,-74.2C16.9,-80.6,27.1,-55.7,39.5,-47.1Z",
    "M42.7,-50.5C55.1,-40.8,64.5,-26.5,67.8,-10.7C71.1,5.1,68.3,22.3,59.1,35.1C49.9,47.9,34.3,56.2,17.7,60.4C1.1,64.6,-16.5,64.7,-31.4,58C-46.3,51.3,-58.5,37.8,-64.1,22.2C-69.7,6.6,-68.7,-11.1,-61.3,-25.1C-53.9,-39.1,-40.1,-49.4,-26.2,-58.7C-12.3,-68,-6.2,-76.3,4.7,-81.9C15.6,-87.5,30.3,-60.2,42.7,-50.5Z",
  ];
  return (
    <motion.svg
      viewBox="-100 -100 200 200"
      className="absolute w-64 h-64 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none"
    >
      <motion.path
        fill="hsl(var(--accent-purple))"
        animate={{ d: paths[step % paths.length] }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
    </motion.svg>
  );
};

/* ── particle burst ── */
const ParticleBurst = ({ active }: { active: boolean }) => {
  if (!active) return null;
  const particles = Array.from({ length: 24 });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((_, i) => {
        const angle = (i / particles.length) * 360;
        const dist = 80 + Math.random() * 120;
        const rad = (angle * Math.PI) / 180;
        return (
          <motion.div
            key={i}
            className="absolute w-2 h-2 rounded-full"
            style={{
              left: "50%",
              top: "50%",
              background: i % 3 === 0 ? "#d4a843" : i % 3 === 1 ? "hsl(var(--accent-purple))" : "white",
            }}
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{
              x: Math.cos(rad) * dist,
              y: Math.sin(rad) * dist,
              opacity: 0,
              scale: 0,
            }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
};

/* ── typing text ── */
const TypingText = ({ text, className }: { text: string; className?: string }) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, 45);
    return () => clearInterval(iv);
  }, [text]);
  return (
    <span className={className}>
      {displayed}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
        className="inline-block w-0.5 h-5 bg-white/60 ml-0.5 align-middle"
      />
    </span>
  );
};

/* ── progress dots ── */
const ProgressDots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex gap-2 justify-center">
    {Array.from({ length: total }).map((_, i) => (
      <motion.div
        key={i}
        className="rounded-full"
        animate={{
          width: i === current ? 24 : 8,
          height: 8,
          backgroundColor: i === current ? "white" : "rgba(255,255,255,0.3)",
        }}
        transition={{ duration: 0.3 }}
      />
    ))}
  </div>
);

/* ── wobbling shape ── */
const WobbleShape = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.div
    animate={{ rotate: [-3, 3, -2, 4, -3], scale: [1, 1.05, 0.97, 1.03, 1] }}
    transition={{ duration: 4, repeat: Infinity, delay, ease: "easeInOut" }}
  >
    {children}
  </motion.div>
);

/* ── tilt card ── */
const TiltCard = ({ delay = 0, color }: { delay?: number; color: string }) => (
  <motion.div
    className="w-20 h-28 rounded-xl border-[4px] border-foreground/20"
    style={{ background: color, transformStyle: "preserve-3d" }}
    initial={{ opacity: 0, rotateY: -40, rotateX: 15, y: 30 }}
    animate={{ opacity: 1, rotateY: [-8, 8, -5, 6, -8], rotateX: [5, -5, 3, -3, 5], y: 0 }}
    transition={{
      opacity: { duration: 0.5, delay },
      y: { duration: 0.6, delay },
      rotateY: { duration: 5, repeat: Infinity, delay: delay + 0.5, ease: "easeInOut" },
      rotateX: { duration: 6, repeat: Infinity, delay: delay + 0.3, ease: "easeInOut" },
    }}
  />
);

/* ── step content ── */
const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
};
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const StepContent = ({ step, burst }: { step: number; burst: boolean }) => {
  const content: Record<number, React.ReactNode> = {
    0: (
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col items-center gap-6 relative">
        <Blob size={100} color="hsl(var(--accent-purple) / 0.4)" x={-60} y={-40} delay={0} />
        <Blob size={70} color="#d4a843" x={80} y={20} delay={0.5} />
        <Blob size={50} color="hsl(var(--accent-purple-light) / 0.5)" x={-30} y={60} delay={1} />
        <MorphBlob step={0} />
        <motion.div variants={fadeUp} className="text-5xl">👋</motion.div>
        <motion.h2 variants={fadeUp} className="text-3xl font-[900] lowercase tracking-tighter text-white text-center">
          vizura how-to
        </motion.h2>
        <motion.p variants={fadeUp} className="text-sm font-extrabold lowercase text-white/50 text-center">
          quick walkthrough — takes 30 seconds
        </motion.p>
      </motion.div>
    ),
    1: (
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col items-center gap-6 relative">
        <Blob size={60} color="#d4a843" x={-80} y={-30} delay={0.2} />
        <Blob size={90} color="hsl(var(--accent-purple) / 0.3)" x={60} y={40} delay={0.7} />
        <MorphBlob step={1} />
        <motion.div variants={fadeUp} className="text-5xl">
          <WobbleShape>✨</WobbleShape>
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-3xl font-[900] lowercase tracking-tighter text-white text-center">
          make any character you want
        </motion.h2>
        <motion.p variants={fadeUp} className="text-sm font-extrabold lowercase text-white/50 text-center">
          dream her up — we'll bring her to life
        </motion.p>
        <motion.div variants={fadeUp} className="flex gap-3 mt-2">
          {["💃", "🧝‍♀️", "👩‍🚀"].map((e, i) => (
            <motion.span
              key={i}
              className="text-3xl"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
            >
              {e}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>
    ),
    2: (
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col items-center gap-5 relative">
        <MorphBlob step={2} />
        <motion.h2 variants={fadeUp} className="text-2xl font-[900] lowercase tracking-tighter text-white text-center">
          use the controls to shape their look
        </motion.h2>
        <motion.div variants={fadeUp} className="w-full flex flex-col gap-3 mt-2">
          {[
            { label: "ethnicity", desc: "pick where she's from" },
            { label: "age", desc: "18 to 40" },
            { label: "hair", desc: "blonde, brunette, red…" },
            { label: "eyes", desc: "brown, blue, green…" },
            { label: "body", desc: "slim, regular, curvy" },
          ].map((item, i) => (
            <motion.div
              key={item.label}
              variants={fadeUp}
              className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-2.5"
            >
              <span className="text-xs font-[900] lowercase text-white w-16">{item.label}</span>
              <span className="text-xs font-extrabold lowercase text-white/40">{item.desc}</span>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    ),
    3: (
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col items-center gap-6 relative">
        <Blob size={80} color="hsl(var(--accent-purple) / 0.3)" x={-50} y={-20} delay={0.3} />
        <MorphBlob step={0} />
        <motion.div variants={fadeUp}>
          <WobbleShape delay={0.2}>
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <RefreshCw size={48} strokeWidth={3} className="text-white" />
            </motion.div>
          </WobbleShape>
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-3xl font-[900] lowercase tracking-tighter text-white text-center">
          not perfect? regenerate
        </motion.h2>
        <motion.p variants={fadeUp} className="text-sm font-extrabold lowercase text-white/50 text-center">
          hit create again for better results — each attempt costs 1 credit
        </motion.p>
      </motion.div>
    ),
    4: (
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col items-center gap-6 relative">
        <Blob size={70} color="#d4a843" x={70} y={-40} delay={0.1} />
        <MorphBlob step={1} />
        <motion.div variants={fadeUp} className="text-5xl">
          <WobbleShape>
            <Camera size={48} strokeWidth={3} className="text-white" />
          </WobbleShape>
        </motion.div>
        <motion.h2 variants={fadeUp} className="text-3xl font-[900] lowercase tracking-tighter text-white text-center">
          now create photos of them
        </motion.h2>
        <motion.div variants={fadeUp} className="flex gap-4 mt-4" style={{ perspective: 600 }}>
          <TiltCard delay={0} color="hsl(var(--accent-purple) / 0.15)" />
          <TiltCard delay={0.15} color="#d4a843aa" />
          <TiltCard delay={0.3} color="hsl(var(--foreground) / 0.08)" />
        </motion.div>
      </motion.div>
    ),
    5: (
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col items-center gap-6 relative">
        <Blob size={60} color="hsl(var(--accent-purple) / 0.3)" x={-70} y={30} delay={0.4} />
        <MorphBlob step={2} />
        <motion.h2 variants={fadeUp} className="text-2xl font-[900] lowercase tracking-tighter text-white text-center">
          describe what you want in the prompt
        </motion.h2>
        <motion.div variants={fadeUp} className="w-full rounded-2xl border-[4px] border-foreground/20 bg-white/10 px-4 py-3 min-h-[80px]">
          <TypingText
            text="sitting in a cafe, golden hour lighting, wearing a white summer dress"
            className="text-sm font-extrabold lowercase text-white/70"
          />
        </motion.div>
        <motion.p variants={fadeUp} className="text-xs font-extrabold lowercase text-white/40 text-center">
          the more detail, the better the result
        </motion.p>
      </motion.div>
    ),
    6: (
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="flex flex-col items-center gap-8 relative">
        <ParticleBurst active={burst} />
        <Blob size={100} color="#d4a84366" x={-40} y={-50} delay={0} />
        <Blob size={80} color="hsl(var(--accent-purple) / 0.3)" x={50} y={30} delay={0.3} />
        <motion.h2 variants={fadeUp} className="text-4xl font-[900] lowercase tracking-tighter text-white text-center">
          ready to create?
        </motion.h2>
        <motion.p variants={fadeUp} className="text-sm font-extrabold lowercase text-white/50 text-center">
          sign up free — your first creation is on us
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
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    }
  }, [step]);

  // auto-advance
  useEffect(() => {
    if (!open || step >= TOTAL_STEPS - 1) return;
    const timer = setTimeout(advance, AUTO_ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [open, step, advance]);

  // reset on open
  useEffect(() => {
    if (open) {
      setStep(0);
      setBurst(false);
    }
  }, [open]);

  const handleLetsGo = () => {
    setBurst(true);
    setTimeout(onDismiss, 900);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center touch-manipulation select-none"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={step < TOTAL_STEPS - 1 ? advance : undefined}
          style={{ cursor: step < TOTAL_STEPS - 1 ? "pointer" : "default" }}
        >
          {/* backdrop — 95% dark, no backdrop-blur for perf */}
          <div className="absolute inset-0 bg-foreground/95" />

          {/* content card */}
          <motion.div
            className="relative z-10 w-full max-w-sm mx-4 flex flex-col items-center"
            initial={{ scale: 0.95, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" as const }}
          >
            {/* step content */}
            <div className="w-full min-h-[340px] flex items-center justify-center px-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ duration: 0.35 }}
                  className="w-full"
                >
                  <StepContent step={step} burst={burst} />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* bottom controls */}
            <div className="mt-8 flex flex-col items-center gap-6 w-full">
              {step === TOTAL_STEPS - 1 ? (
                <motion.button
                  onClick={(e) => { e.stopPropagation(); handleLetsGo(); }}
                  className="relative h-14 w-full rounded-2xl text-sm font-[900] lowercase tracking-tight text-background overflow-hidden"
                  style={{ background: "#d4a843" }}
                  whileTap={{ scale: 0.97 }}
                >
                  {/* pulsing glow */}
                  <motion.div
                    className="absolute inset-0 rounded-2xl"
                    animate={{
                      boxShadow: [
                        "0 0 20px 0px #d4a84366",
                        "0 0 40px 8px #d4a84388",
                        "0 0 20px 0px #d4a84366",
                      ],
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  <span className="relative z-10">let's go 🚀</span>
                </motion.button>
              ) : (
                <motion.div
                  className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white text-foreground pointer-events-none"
                  animate={{ scale: [1, 1.08, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  aria-hidden
                >
                  <ArrowRight size={24} strokeWidth={3} />
                </motion.div>
              )}

              {/* tap hint */}
              {step < TOTAL_STEPS - 1 && (
                <motion.p
                  className="text-[10px] font-extrabold lowercase text-white/30"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 1.5 }}
                >
                  tap anywhere to continue
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
