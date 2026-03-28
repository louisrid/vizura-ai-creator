import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Gem } from "lucide-react";

const TOTAL = 5;

/* ── simple progress dots ── */
const Dots = ({ current }: { current: number }) => (
  <div className="flex items-center justify-center gap-2.5">
    {Array.from({ length: TOTAL }).map((_, i) => (
      <div
        key={i}
        className="rounded-full"
        style={{
          width: i === current ? 10 : 7,
          height: i === current ? 10 : 7,
          background: i === current ? "#fff" : "hsl(0 0% 100% / 0.25)",
          transition: "all 0.2s",
        }}
      />
    ))}
  </div>
);

/* ── mini dark grey box ── */
const MiniBox = ({ w = 60, h = 60 }: { w?: number; h?: number }) => (
  <div className="rounded-xl" style={{ width: w, height: h, background: "hsl(0 0% 15%)" }} />
);

/* ── screen 1 ── */
const Screen1 = () => (
  <div className="flex flex-col items-center gap-6">
    <h2 className="text-[1.8rem] font-[900] lowercase leading-tight tracking-tight text-white text-center">
      create your character
    </h2>
    {/* mini 2-col options preview */}
    <div className="grid grid-cols-2 gap-2">
      {["style", "hair", "eyes", "body"].map((l) => (
        <div key={l} className="flex h-10 w-28 items-center justify-center rounded-xl" style={{ background: "hsl(0 0% 15%)" }}>
          <span className="text-[10px] font-extrabold lowercase text-white/40">{l}</span>
        </div>
      ))}
    </div>
    <p className="text-sm font-bold lowercase text-white/70 text-center">
      pick a style, hair, eyes, body type
    </p>
  </div>
);

/* ── screen 2 ── */
const Screen2 = () => (
  <div className="flex flex-col items-center gap-6">
    <h2 className="text-[1.8rem] font-[900] lowercase leading-tight tracking-tight text-white text-center">
      choose your face
    </h2>
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <MiniBox key={i} w={56} h={56} />
      ))}
    </div>
    <p className="text-sm font-bold lowercase text-white/70 text-center max-w-[16rem]">
      we generate 6 faces from your choices. pick your favourite
    </p>
  </div>
);

/* ── screen 3 ── */
const Screen3 = () => (
  <div className="flex flex-col items-center gap-6">
    <h2 className="text-[1.8rem] font-[900] lowercase leading-tight tracking-tight text-white text-center">
      create photos
    </h2>
    <div className="flex flex-col gap-2 w-full max-w-[14rem]">
      <div className="flex h-10 items-center rounded-xl px-3" style={{ background: "hsl(0 0% 15%)" }}>
        <span className="text-[10px] font-extrabold lowercase text-white/30">describe your scene...</span>
      </div>
      <MiniBox w={224} h={100} />
    </div>
    <p className="text-sm font-bold lowercase text-white/70 text-center max-w-[16rem]">
      write a scene. your character gets placed in it. costs 1 gem per photo
    </p>
  </div>
);

/* ── screen 4 ── */
const Screen4 = () => (
  <div className="flex flex-col items-center gap-6">
    <h2 className="text-[1.8rem] font-[900] lowercase leading-tight tracking-tight text-white text-center">
      save and buy
    </h2>
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: "hsl(140 60% 20%)" }}>
      <Gem size={28} className="text-green-400" />
    </div>
    <p className="text-sm font-bold lowercase text-white/70 text-center max-w-[16rem]">
      photos save to your storage. get more gems with top-ups or subscribe for $7/month
    </p>
  </div>
);

/* ── screen 5 ── */
const Screen5 = ({ onGo }: { onGo: () => void }) => (
  <div className="flex flex-col items-center gap-8">
    <h2 className="text-[1.8rem] font-[900] lowercase leading-tight tracking-tight text-white text-center">
      ready?
    </h2>
    <button
      onClick={(e) => {
        e.stopPropagation();
        onGo();
      }}
      className="h-14 w-full max-w-[14rem] rounded-full text-lg font-[900] lowercase tracking-tight text-black active:scale-[0.95]"
      style={{ background: "hsl(40 100% 55%)", transition: "transform 0.05s" }}
    >
      let's go
    </button>
  </div>
);

/* ═══════════════════ MAIN ═══════════════════ */

interface IntroSequenceProps {
  open: boolean;
  onComplete: () => void;
}

const IntroSequence = ({ open, onComplete }: IntroSequenceProps) => {
  const [step, setStep] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  // lock scroll
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const advance = useCallback(() => {
    setStep((s) => (s < TOTAL - 1 ? s + 1 : s));
  }, []);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex flex-col bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={() => {
            if (step < TOTAL - 1) advance();
          }}
        >
          {/* content */}
          <div className="flex-1 flex items-center justify-center px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                className="w-full max-w-sm"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {step === 0 && <Screen1 />}
                {step === 1 && <Screen2 />}
                {step === 2 && <Screen3 />}
                {step === 3 && <Screen4 />}
                {step === 4 && <Screen5 onGo={onComplete} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* dots */}
          <div className="pb-[max(env(safe-area-inset-bottom),1.5rem)] pt-4">
            <Dots current={step} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default IntroSequence;
