import { useState, useCallback, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const TOTAL = 5;

/* ── mock pill ── */
const Pill = ({ label, delay = 0 }: { label: string; delay?: number }) => (
  <motion.div
    className="flex h-10 items-center justify-center rounded-full px-4"
    style={{ background: "hsl(0 0% 14%)" }}
    initial={{ opacity: 0, y: 14, scale: 0.92 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
  >
    <span className="text-sm font-[800] lowercase tracking-tight text-white/70">{label}</span>
  </motion.div>
);

/* ── mock input ── */
const MockInput = ({ label, tall, delay = 0 }: { label: string; tall?: boolean; delay?: number }) => (
  <motion.div
    className="flex w-full flex-col gap-1.5"
    initial={{ opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
  >
    <span className="text-[0.7rem] font-bold lowercase text-white/40">{label}</span>
    <div
      className="w-full rounded-xl"
      style={{ background: "hsl(0 0% 14%)", height: tall ? 72 : 40 }}
    />
  </motion.div>
);

/* ── section label ── */
const SectionLabel = ({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) => (
  <motion.p
    className="text-[0.7rem] font-bold uppercase tracking-widest text-white/30"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ delay, duration: 0.3 }}
  >
    {children}
  </motion.p>
);

/* ── progress dots ── */
const Dots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="rounded-full transition-all duration-200"
        style={{
          width: i === current ? 22 : 8,
          height: 8,
          background: i === current ? "white" : "hsl(0 0% 100% / 0.2)",
        }}
      />
    ))}
  </div>
);

/* ═══════════ SCREENS ═══════════ */

const Screen1 = () => (
  <div className="flex flex-col items-center gap-6">
    <motion.h2
      className="text-[1.8rem] font-[900] lowercase leading-tight tracking-tight text-white text-center"
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      pick a style
    </motion.h2>
    <motion.p
      className="text-sm font-bold lowercase text-white/50 text-center max-w-[16rem]"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
    >
      choose how your character looks — natural, model, or egirl
    </motion.p>
    <div className="flex flex-wrap justify-center gap-2.5 pt-2">
      <Pill label="natural" delay={0.15} />
      <Pill label="model" delay={0.22} />
      <Pill label="egirl" delay={0.29} />
    </div>
  </div>
);

const Screen2 = () => (
  <div className="flex flex-col items-center gap-6">
    <motion.h2
      className="text-[1.8rem] font-[900] lowercase leading-tight tracking-tight text-white text-center"
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      hair, eyes & body
    </motion.h2>
    <motion.p
      className="text-sm font-bold lowercase text-white/50 text-center max-w-[16rem]"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
    >
      fine-tune the details that make your character unique
    </motion.p>
    <div className="flex flex-col gap-3 w-full pt-2">
      <SectionLabel delay={0.15}>hair colour</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {["blonde", "brunette", "black", "red"].map((h, i) => (
          <Pill key={h} label={h} delay={0.18 + i * 0.05} />
        ))}
      </div>
      <SectionLabel delay={0.35}>eye colour</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {["brown", "blue", "green"].map((e, i) => (
          <Pill key={e} label={e} delay={0.38 + i * 0.05} />
        ))}
      </div>
      <SectionLabel delay={0.5}>body type</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {["slim", "regular", "curvy"].map((b, i) => (
          <Pill key={b} label={b} delay={0.53 + i * 0.05} />
        ))}
      </div>
    </div>
  </div>
);

const Screen3 = () => (
  <div className="flex flex-col items-center gap-6">
    <motion.h2
      className="text-[1.8rem] font-[900] lowercase leading-tight tracking-tight text-white text-center"
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      ethnicity & age
    </motion.h2>
    <motion.p
      className="text-sm font-bold lowercase text-white/50 text-center max-w-[16rem]"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
    >
      set their background and how old they are
    </motion.p>
    <div className="flex flex-col gap-3 w-full pt-2">
      <SectionLabel delay={0.15}>ethnicity</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {["american", "brazilian", "japanese", "korean"].map((e, i) => (
          <Pill key={e} label={e} delay={0.18 + i * 0.05} />
        ))}
      </div>
      <SectionLabel delay={0.4}>age</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {["18", "22", "25", "30"].map((a, i) => (
          <Pill key={a} label={a} delay={0.43 + i * 0.05} />
        ))}
      </div>
    </div>
  </div>
);

const Screen4 = () => (
  <div className="flex flex-col items-center gap-6">
    <motion.h2
      className="text-[1.8rem] font-[900] lowercase leading-tight tracking-tight text-white text-center"
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
    >
      name & describe
    </motion.h2>
    <motion.p
      className="text-sm font-bold lowercase text-white/50 text-center max-w-[16rem]"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.3 }}
    >
      give them a name and add any extra details you like
    </motion.p>
    <div className="flex flex-col gap-4 w-full pt-2">
      <MockInput label="character name" delay={0.2} />
      <MockInput label="describe your character" tall delay={0.3} />
    </div>
  </div>
);

const Screen5 = ({ onGo }: { onGo: () => void }) => (
  <div className="flex flex-col items-center gap-8">
    <motion.h2
      className="text-[2.2rem] font-[900] lowercase leading-tight tracking-tight text-white text-center"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45, ease: [0.25, 0.1, 0.25, 1] }}
    >
      ready?
    </motion.h2>
    <motion.p
      className="text-sm font-bold lowercase text-white/50 text-center max-w-[16rem]"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.12, duration: 0.3 }}
    >
      let's create your first character
    </motion.p>
    <motion.button
      onClick={(e) => { e.stopPropagation(); onGo(); }}
      className="h-14 w-full max-w-[15rem] rounded-full text-lg font-[900] lowercase tracking-tight active:scale-[0.95]"
      style={{ background: "hsl(42 100% 50%)", color: "#000", transition: "transform 0.05s" }}
      initial={{ opacity: 0, y: 16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: 0.25, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      whileTap={{ scale: 0.93 }}
    >
      let's go
    </motion.button>
  </div>
);

const screens = [Screen1, Screen2, Screen3, Screen4];

/* ═══════════ MAIN ═══════════ */

interface IntroSequenceProps {
  open: boolean;
  onComplete: () => void;
}

const IntroSequence = ({ open, onComplete }: IntroSequenceProps) => {
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);
  const animating = useRef(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) { setStep(0); animating.current = false; }
  }, [open]);

  const advance = useCallback(() => {
    if (animating.current) return;
    if (step >= TOTAL - 1) return;
    animating.current = true;
    setStep((s) => s + 1);
    setTimeout(() => { animating.current = false; }, 400);
  }, [step]);

  const handleTap = useCallback(() => {
    if (step < TOTAL - 1) advance();
  }, [step, advance]);

  // Lock scroll
  useEffect(() => {
    if (!open) return;
    const root = document.getElementById("root");
    const prev = {
      body: document.body.style.overflow,
      html: document.documentElement.style.overflow,
      root: root?.style.overflow ?? "",
    };
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (root) root.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev.body;
      document.documentElement.style.overflow = prev.html;
      if (root) root.style.overflow = prev.root;
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col bg-black cursor-pointer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleTap}
        >
          {/* Screen content */}
          <div className="flex-1 flex items-center justify-center px-6 overflow-hidden">
            <div className="w-full max-w-sm">
              <AnimatePresence mode="wait">
                <motion.div
                  key={step}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  {step < 4 && (() => { const S = screens[step]; return <S />; })()}
                  {step === 4 && <Screen5 onGo={onComplete} />}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom */}
          <div className="flex flex-col items-center gap-3 pb-[max(env(safe-area-inset-bottom),2rem)] pt-2">
            {step < TOTAL - 1 && (
              <p className="text-[0.65rem] font-bold lowercase text-white/25">tap to continue</p>
            )}
            <Dots current={step} total={TOTAL} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default IntroSequence;
