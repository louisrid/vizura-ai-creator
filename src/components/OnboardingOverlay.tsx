import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Camera, SlidersHorizontal, Sparkles, PenLine } from "lucide-react";
import OverlayShell from "./overlay/OverlayShell";
import {
  dotColors,
  BigTitle,
  Subtitle,
  IconPop,
  ParticleBurst,
  GoldButton,
} from "./overlay/OverlayPrimitives";

const TOTAL_STEPS = 6;

/* ── numbered circle step ── */
const StepCircle = ({ n, delay = 0 }: { n: number; delay?: number }) => (
  <motion.div
    className="flex h-11 w-11 items-center justify-center rounded-full text-base font-[900]"
    style={{ background: dotColors[(n - 1) % dotColors.length], color: "#000" }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 1, scale: [0, 1.25, 0.9, 1] }}
    transition={{ duration: 0.4, delay, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <motion.span
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 2, delay: delay + 0.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {n}
    </motion.span>
  </motion.div>
);

/* ── typing line ── */
const TypingLine = ({ text, delay = 0.5 }: { text: string; delay?: number }) => {
  const [displayed, setDisplayed] = useState("");
  useEffect(() => {
    setDisplayed("");
    let idx = 0;
    const t = window.setTimeout(() => {
      const iv = window.setInterval(() => {
        idx++;
        setDisplayed(text.slice(0, idx));
        if (idx >= text.length) clearInterval(iv);
      }, 36);
      return () => clearInterval(iv);
    }, delay * 1000);
    return () => clearTimeout(t);
  }, [text, delay]);
  return (
    <span className="text-sm font-bold lowercase" style={{ color: "hsl(0 0% 100% / 0.78)" }}>
      {displayed}
      <motion.span
        className="ml-0.5 inline-block h-4 w-[2px] align-middle"
        style={{ background: "hsl(0 0% 100% / 0.4)" }}
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.55, repeat: Infinity }}
      />
    </span>
  );
};

/* ── slot machine reel ── */
const traitSlots = [
  ["👩‍🦰", "👩‍🦱", "👩‍🦳", "👩"],
  ["🏻", "🏼", "🏽", "🏾", "🏿"],
  ["👗", "👔", "🧥", "👙"],
];
const slotLabels = ["hair", "skin", "style"];

const SlotReel = ({ items, delay, speed = 2.8 }: { items: string[]; delay: number; speed?: number }) => {
  const looped = [...items, ...items, ...items];
  const itemH = 48;
  const totalH = items.length * itemH;

  return (
    <motion.div
      className="relative overflow-hidden"
      style={{ width: 52, height: itemH }}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay }}
    >
      <motion.div
        className="flex flex-col items-center"
        animate={{ y: [0, -totalH] }}
        transition={{ duration: speed, delay: delay + 0.4, repeat: Infinity, ease: "linear" }}
      >
        {looped.map((item, i) => (
          <div key={i} className="flex items-center justify-center" style={{ height: itemH, width: 52 }}>
            <span className="text-3xl">{item}</span>
          </div>
        ))}
      </motion.div>
    </motion.div>
  );
};

/* ── photo card ── */
const photoEmojis = ["🌅", "📸", "✨"];
const photoGradients = [
  "linear-gradient(145deg, hsl(270 50% 18%), hsl(320 40% 22%))",
  "linear-gradient(145deg, hsl(210 50% 18%), hsl(250 40% 22%))",
  "linear-gradient(145deg, hsl(340 50% 18%), hsl(20 40% 22%))",
];

const PhotoCard = ({ delay, rotate, index }: { delay: number; rotate: number; index: number }) => (
  <motion.div
    className="rounded-2xl border-[4px] overflow-hidden flex items-center justify-center"
    style={{
      borderColor: "hsl(0 0% 100% / 0.12)",
      background: photoGradients[index % photoGradients.length],
      width: 82,
      height: 116,
      transformOrigin: "bottom center",
    }}
    initial={{ opacity: 0, y: 50, rotate: rotate * 0.5, scale: 0.7 }}
    animate={{ opacity: 1, y: 0, rotate, scale: 1 }}
    transition={{ duration: 0.45, delay, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <motion.span
      className="text-4xl select-none"
      animate={{ scale: [1, 1.1, 1] }}
      transition={{ duration: 2.5, delay: delay + 0.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {photoEmojis[index % photoEmojis.length]}
    </motion.span>
  </motion.div>
);

/* ── control row item ── */
const ControlItem = ({ label, desc, n, delay }: { label: string; desc: string; n: number; delay: number }) => (
  <motion.div
    className="flex items-center gap-3"
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ duration: 0.3, delay, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-[900]"
      style={{ background: dotColors[(n - 1) % dotColors.length], color: "#000" }}
    >
      {n}
    </div>
    <div>
      <span className="text-sm font-[800] lowercase" style={{ color: "hsl(0 0% 100% / 0.9)" }}>{label}</span>
      <span className="ml-1.5 text-xs font-bold lowercase" style={{ color: "hsl(0 0% 100% / 0.6)" }}>{desc}</span>
    </div>
  </motion.div>
);

/* ═══════════════════ SCENES ═══════════════════ */

const Scene0 = () => (
  <div className="flex flex-col items-center gap-3">
    <motion.div animate={{ rotate: [0, -14, 14, -12, 10, -6, 4, 0] }} transition={{ duration: 1.4, delay: 0.4, ease: "easeInOut" }}>
      <IconPop delay={0.15} size={96}><span className="text-[5rem]">👋</span></IconPop>
    </motion.div>
    <BigTitle delay={0.25}>welcome</BigTitle>
    <Subtitle delay={0.4}>make characters and photos in a few taps</Subtitle>
  </div>
);

const Scene1 = () => (
  <div className="flex flex-col items-center gap-3">
    <IconPop delay={0.1} size={96}><Sparkles size={60} strokeWidth={2} style={{ color: dotColors[2] }} /></IconPop>
    <BigTitle delay={0.2}>1. choose a look</BigTitle>
    <Subtitle delay={0.35}>set age, ethnicity, and style</Subtitle>
    <motion.div
      className="mt-2 flex items-center gap-1 rounded-2xl border-[4px] px-3 py-2"
      style={{ borderColor: "hsl(0 0% 100% / 0.12)", background: "hsl(0 0% 100% / 0.04)" }}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.45 }}
    >
      {traitSlots.map((items, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <SlotReel items={items} delay={0.5 + i * 0.15} speed={2.2 + i * 0.6} />
          <span className="text-[9px] font-extrabold lowercase tracking-wider" style={{ color: "hsl(0 0% 100% / 0.3)" }}>{slotLabels[i]}</span>
        </div>
      ))}
    </motion.div>
  </div>
);

const Scene2 = () => (
  <div className="flex flex-col items-center gap-3">
    <IconPop delay={0.1} size={80}><SlidersHorizontal size={48} strokeWidth={2} style={{ color: dotColors[3] }} /></IconPop>
    <BigTitle delay={0.2}>2. set the details</BigTitle>
    <Subtitle delay={0.35}>hair, eyes, body type, and more</Subtitle>
    <div className="mt-1 flex w-full max-w-[17rem] flex-col gap-2.5">
      <ControlItem label="hair colour" desc="blonde, brunette, red" n={1} delay={0.5} />
      <ControlItem label="eye colour" desc="blue, green, brown" n={2} delay={0.6} />
      <ControlItem label="body type" desc="slim, athletic, curvy" n={3} delay={0.7} />
      <ControlItem label="extra details" desc="tattoos, freckles" n={4} delay={0.8} />
    </div>
  </div>
);

const Scene3 = () => (
  <div className="flex flex-col items-center gap-3">
    <IconPop delay={0.1} size={88}><Camera size={52} strokeWidth={2} style={{ color: dotColors[1] }} /></IconPop>
    <BigTitle delay={0.2}>3. generate photos</BigTitle>
    <Subtitle delay={0.35}>realistic images in any setting</Subtitle>
    <motion.div className="flex items-center justify-center pt-3" style={{ gap: 0 }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
      <div style={{ transform: "translateY(12px)" }}><PhotoCard delay={0.5} rotate={-10} index={0} /></div>
      <div style={{ transform: "translateY(0px)", zIndex: 2, marginLeft: -10, marginRight: -10 }}><PhotoCard delay={0.6} rotate={0} index={1} /></div>
      <div style={{ transform: "translateY(12px)" }}><PhotoCard delay={0.7} rotate={10} index={2} /></div>
    </motion.div>
  </div>
);

const Scene4 = () => (
  <div className="flex flex-col items-center gap-3">
    <IconPop delay={0.1} size={80}><PenLine size={48} strokeWidth={2} style={{ color: dotColors[5] }} /></IconPop>
    <BigTitle delay={0.2}>4. add a prompt</BigTitle>
    <Subtitle delay={0.35}>describe the pose, place, and mood</Subtitle>
    <motion.div
      className="mt-1 w-full max-w-[17rem] rounded-2xl border-[4px] px-4 py-3"
      style={{ borderColor: "hsl(0 0% 100% / 0.1)", background: "hsl(0 0% 100% / 0.04)" }}
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.5, ease: [0.2, 0.9, 0.2, 1] }}
    >
      <div className="mb-2 text-[10px] font-extrabold lowercase tracking-wider" style={{ color: "hsl(0 0% 100% / 0.45)" }}>prompt</div>
      <TypingLine text="sitting in a cafe, golden hour lighting" delay={0.8} />
    </motion.div>
  </div>
);

const Scene5 = ({ burst, onLetsGo }: { burst: boolean; onLetsGo: () => void }) => (
  <div className="relative flex flex-col items-center gap-3">
    <ParticleBurst active={burst} />
    <IconPop delay={0.1} size={96}><span className="text-[5rem]">🚀</span></IconPop>
    <BigTitle delay={0.2}>ready</BigTitle>
    <Subtitle delay={0.35}>sign up free and start creating</Subtitle>
    <GoldButton onClick={onLetsGo} delay={0.2}>let's go</GoldButton>
  </div>
);

/* ═══════════════════ MAIN ═══════════════════ */

const OnboardingOverlay = ({ open, onDismiss, onLetsGo: externalLetsGo }: { open: boolean; onDismiss: () => void; onLetsGo?: () => void }) => {
  const [burst, setBurst] = useState(false);

  const handleLetsGo = () => {
    setBurst(true);
    externalLetsGo?.();
    window.setTimeout(onDismiss, 700);
  };

  return (
    <OverlayShell open={open} totalSteps={TOTAL_STEPS}>
      {(step) => (
        <>
          {step === 0 && <Scene0 />}
          {step === 1 && <Scene1 />}
          {step === 2 && <Scene2 />}
          {step === 3 && <Scene3 />}
          {step === 4 && <Scene4 />}
          {step === 5 && <Scene5 burst={burst} onLetsGo={handleLetsGo} />}
        </>
      )}
    </OverlayShell>
  );
};

export default OnboardingOverlay;
