import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";

const TOTAL = 5;
const YELLOW = "hsl(var(--neon-yellow))";

/* ── progress dots ── */
const Dots = ({ current }: { current: number }) => (
  <div className="flex items-center justify-center gap-2.5">
    {Array.from({ length: TOTAL }).map((_, i) => (
      <div
        key={i}
        className="rounded-full"
        style={{
          width: i === current ? 10 : 7,
          height: i === current ? 10 : 7,
          background: i === current ? YELLOW : "hsl(0 0% 100% / 0.25)",
          transition: "all 0.2s",
        }}
      />
    ))}
  </div>
);

/* ── big white confirm button ── */
const ConfirmButton = ({ onClick }: { onClick: (e: React.MouseEvent) => void }) => (
  <motion.button
    onClick={onClick}
    className="mt-6 h-16 w-full max-w-[16rem] rounded-2xl border-[4px] border-white bg-white text-lg font-[900] lowercase tracking-tight text-black active:scale-[0.95]"
    style={{ transition: "transform 0.05s" }}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: 0.4, duration: 0.25 }}
  >
    next
  </motion.button>
);

/* ── mini dark grey box ── */
const MiniBox = ({ w = 60, h = 60 }: { w?: number; h?: number }) => (
  <div className="rounded-xl" style={{ width: w, height: h, background: "hsl(0 0% 15%)" }} />
);

/* ── screen 1 ── */
const Screen1 = ({ onNext }: { onNext: (e: React.MouseEvent) => void }) => (
  <div className="flex flex-col items-center gap-5">
    <span className="text-5xl">🎨</span>
    <h2 className="text-[1.8rem] font-[900] lowercase leading-tight tracking-tight text-white text-center">
      create your character
    </h2>
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
    <ConfirmButton onClick={onNext} />
  </div>
);

/* ── screen 2 ── */
const Screen2 = ({ onNext }: { onNext: (e: React.MouseEvent) => void }) => (
  <div className="flex flex-col items-center gap-5">
    <span className="text-5xl">🧑‍🎨</span>
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
    <ConfirmButton onClick={onNext} />
  </div>
);

/* ── screen 3 ── */
const Screen3 = ({ onNext }: { onNext: (e: React.MouseEvent) => void }) => (
  <div className="flex flex-col items-center gap-5">
    <span className="text-5xl">📸</span>
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
    <ConfirmButton onClick={onNext} />
  </div>
);

/* ── screen 4 ── */
const Screen4 = ({ onNext }: { onNext: (e: React.MouseEvent) => void }) => (
  <div className="flex flex-col items-center gap-5">
    <span className="text-5xl">💎</span>
    <h2 className="text-[1.8rem] font-[900] lowercase leading-tight tracking-tight text-white text-center">
      save and buy
    </h2>
    <p className="text-sm font-bold lowercase text-white/70 text-center max-w-[16rem]">
      photos save to your storage. get more gems with top-ups or subscribe for $7/month
    </p>
    <ConfirmButton onClick={onNext} />
  </div>
);

/* ── screen 5 ── */
const Screen5 = ({ onGo }: { onGo: () => void }) => (
  <div className="flex flex-col items-center gap-6">
    <span className="text-5xl">🚀</span>
    <h2 className="text-[1.8rem] font-[900] lowercase leading-tight tracking-tight text-white text-center">
      ready?
    </h2>
    <button
      onClick={(e) => {
        e.stopPropagation();
        onGo();
      }}
      className="h-16 w-full max-w-[16rem] rounded-2xl border-[4px] text-lg font-[900] lowercase tracking-tight active:scale-[0.95]"
      style={{
        background: YELLOW,
        borderColor: YELLOW,
        color: "#000",
        transition: "transform 0.05s",
      }}
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

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const advance = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
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
        >
          {/* content */}
          <div className="flex-1 flex items-center justify-center px-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                className="w-full max-w-sm flex flex-col items-center"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {step === 0 && <Screen1 onNext={advance} />}
                {step === 1 && <Screen2 onNext={advance} />}
                {step === 2 && <Screen3 onNext={advance} />}
                {step === 3 && <Screen4 onNext={advance} />}
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
