import { useState } from "react";
import { motion } from "framer-motion";
import { Scissors, Eye, User, Pen, Zap, Check } from "lucide-react";
import OverlayShell from "./overlay/OverlayShell";
import { BigTitle, Subtitle } from "./overlay/OverlayPrimitives";

import face1 from "@/assets/onboarding-face1.png";
import face2 from "@/assets/onboarding-face2.png";
import face3 from "@/assets/onboarding-face3.png";
import face4 from "@/assets/onboarding-face4.png";
import face5 from "@/assets/onboarding-face5.png";
import face6 from "@/assets/onboarding-face6.png";

const TOTAL_STEPS = 4;
const faces = [face1, face2, face3, face4, face5, face6];

/* ── colored icon badge ── */
const IconBadge = ({
  children,
  delay = 0,
  bg,
  border,
}: {
  children: React.ReactNode;
  delay?: number;
  bg: string;
  border: string;
}) => (
  <motion.div
    className="flex h-16 w-16 items-center justify-center rounded-2xl border-[5px]"
    style={{ background: bg, borderColor: border }}
    initial={{ opacity: 0, scale: 0.6, rotate: -8 }}
    animate={{ opacity: 1, scale: 1, rotate: 0 }}
    transition={{ duration: 0.35, delay, ease: [0.2, 0.9, 0.2, 1] }}
  >
    {children}
  </motion.div>
);

/* ═══════════════════ SCENES ═══════════════════ */

/* Screen 1: create your character — blue + pink + green icons */
const Scene0 = () => (
  <div className="flex flex-col items-center gap-5">
    <BigTitle delay={0.1}>create your character</BigTitle>

    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2 }}
    >
      <IconBadge delay={0.25} bg="hsl(210 100% 25%)" border="hsl(210 100% 50%)">
        <Scissors size={28} strokeWidth={2.5} color="hsl(210 100% 60%)" />
      </IconBadge>
      <IconBadge delay={0.35} bg="hsl(330 100% 25%)" border="hsl(330 100% 50%)">
        <Eye size={28} strokeWidth={2.5} color="hsl(330 100% 60%)" />
      </IconBadge>
      <IconBadge delay={0.45} bg="hsl(140 100% 20%)" border="hsl(140 100% 45%)">
        <User size={28} strokeWidth={2.5} color="hsl(140 100% 50%)" />
      </IconBadge>
    </motion.div>

    <Subtitle delay={0.55}>pick your look</Subtitle>
  </div>
);

/* Screen 2: choose your face — cartoon woman faces in 2x3 grid */
const Scene1 = () => {
  const borderColors = [
    "hsl(210 100% 50%)",
    "hsl(330 100% 50%)",
    "hsl(55 100% 50%)",
    "hsl(140 100% 45%)",
    "hsl(280 100% 55%)",
    "hsl(15 100% 50%)",
  ];

  return (
    <div className="flex flex-col items-center gap-5">
      <BigTitle delay={0.1}>choose your face</BigTitle>

      <motion.div
        className="grid grid-cols-3 gap-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.3 }}
      >
        {faces.map((src, i) => (
          <motion.div
            key={i}
            className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border-[5px]"
            style={{
              background: "hsl(0 0% 10%)",
              borderColor: i === 2 ? borderColors[i] : "hsl(0 0% 20%)",
            }}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.25 + i * 0.06, duration: 0.25 }}
          >
            <img
              src={src}
              alt=""
              className="h-full w-full object-cover"
              width={80}
              height={80}
            />
            {i === 2 && (
               <motion.div
                 className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full"
                 style={{ background: "hsl(55 100% 50%)" }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.55, type: "spring", stiffness: 400 }}
              >
                <Check size={12} strokeWidth={3} color="#000" />
              </motion.div>
            )}
          </motion.div>
        ))}
      </motion.div>

      <Subtitle delay={0.6}>
        we'll generate 6 faces. pick your favourite
      </Subtitle>
    </div>
  );
};

/* Screen 3: create photos — orange prompt + green generate */
const Scene2 = () => (
  <div className="flex flex-col items-center gap-5">
    <BigTitle delay={0.1}>create photos</BigTitle>

    <motion.div
      className="flex w-full max-w-[16rem] flex-col gap-2"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.3 }}
    >
      {/* fake prompt input — neon blue */}
      <div
        className="flex h-14 items-center rounded-2xl border-[5px] px-4"
        style={{
          background: "hsl(210 100% 15%)",
          borderColor: "hsl(210 100% 50%)",
        }}
      >
        <Pen size={16} strokeWidth={2.5} color="#fff" />
        <span
          className="ml-3 text-xs font-extrabold lowercase"
          style={{ color: "hsl(0 0% 100% / 0.7)" }}
        >
          describe your scene...
        </span>
      </div>

      {/* fake generate button — neon green */}
      <motion.div
        className="flex h-14 items-center justify-center gap-2 rounded-2xl border-[5px]"
        style={{
          background: "hsl(140 100% 15%)",
          borderColor: "hsl(140 100% 45%)",
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.25 }}
      >
        <Zap size={18} strokeWidth={2.5} color="#fff" />
        <span
          className="text-sm font-extrabold lowercase"
          style={{ color: "#fff" }}
        >
          create
        </span>
      </motion.div>
    </motion.div>

    <Subtitle delay={0.5}>
      write a scene. we'll put your character in it
    </Subtitle>
  </div>
);

/* Screen 4: ready? — amber let's go button */
const Scene3 = ({ onLetsGo }: { onLetsGo: () => void }) => (
  <div className="flex flex-col items-center gap-6">
    <BigTitle delay={0.1}>ready?</BigTitle>

    <button
      onClick={(e) => {
        e.stopPropagation();
        onLetsGo();
      }}
      className="relative h-16 w-full max-w-[16rem] border-[5px] text-xl font-[900] lowercase tracking-tight active:scale-[0.93]"
      style={{
      background: "hsl(55 100% 50%)",
        borderColor: "hsl(55 100% 50%)",
        color: "#000",
        borderRadius: 16,
        transition: "transform 0.05s",
      }}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        let's go
      </span>
    </button>
  </div>
);

/* ═══════════════════ MAIN ═══════════════════ */

const OnboardingOverlay = ({
  open,
  onDismiss,
  onLetsGo: externalLetsGo,
}: {
  open: boolean;
  onDismiss: () => void;
  onLetsGo?: () => void;
}) => {
  const handleLetsGo = () => {
    externalLetsGo?.();
    window.setTimeout(onDismiss, 500);
  };

  return (
    <OverlayShell open={open} totalSteps={TOTAL_STEPS} onSkip={onDismiss}>
      {(step) => (
        <>
          {step === 0 && <Scene0 />}
          {step === 1 && <Scene1 />}
          {step === 2 && <Scene2 />}
          {step === 3 && <Scene3 onLetsGo={handleLetsGo} />}
        </>
      )}
    </OverlayShell>
  );
};

export default OnboardingOverlay;
