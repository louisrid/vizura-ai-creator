import { useState } from "react";
import { motion } from "framer-motion";
import { Scissors, Eye, User, Grid2x2, Pen, Zap } from "lucide-react";
import OverlayShell from "./overlay/OverlayShell";
import {
  BigTitle,
  Subtitle,
  ProgressDots,
} from "./overlay/OverlayPrimitives";

const TOTAL_STEPS = 4;

/* ── icon badge used in scene previews ── */
const IconBadge = ({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) => (
  <motion.div
    className="flex h-16 w-16 items-center justify-center rounded-2xl border-[5px]"
    style={{
      background: "hsl(0 0% 12%)",
      borderColor: "hsl(0 0% 20%)",
    }}
    initial={{ opacity: 0, scale: 0.6 }}
    animate={{ opacity: 1, scale: 1 }}
    transition={{ duration: 0.3, delay, ease: [0.2, 0.9, 0.2, 1] }}
  >
    {children}
  </motion.div>
);

/* ═══════════════════ SCENES ═══════════════════ */

/* Screen 1: create your character */
const Scene0 = () => (
  <div className="flex flex-col items-center gap-5">
    <BigTitle delay={0.1}>create your character</BigTitle>

    <motion.div
      className="flex items-center gap-3"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.25 }}
    >
      <IconBadge delay={0.3}>
        <Scissors size={28} strokeWidth={2.5} color="#fff" />
      </IconBadge>
      <IconBadge delay={0.4}>
        <Eye size={28} strokeWidth={2.5} color="#fff" />
      </IconBadge>
      <IconBadge delay={0.5}>
        <User size={28} strokeWidth={2.5} color="#fff" />
      </IconBadge>
    </motion.div>

    <Subtitle delay={0.55}>pick your look</Subtitle>
  </div>
);

/* Screen 2: choose your face */
const Scene1 = () => (
  <div className="flex flex-col items-center gap-5">
    <BigTitle delay={0.1}>choose your face</BigTitle>

    <motion.div
      className="grid grid-cols-2 gap-2"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.3 }}
    >
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.div
          key={i}
          className="flex h-16 w-20 items-center justify-center rounded-2xl border-[5px]"
          style={{
            background: "hsl(0 0% 12%)",
            borderColor: i === 2 ? "hsl(55 90% 58%)" : "hsl(0 0% 20%)",
          }}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 + i * 0.06, duration: 0.25 }}
        >
          <Grid2x2
            size={20}
            strokeWidth={2}
            color={i === 2 ? "hsl(55 90% 58%)" : "hsl(0 0% 40%)"}
          />
        </motion.div>
      ))}
    </motion.div>

    <Subtitle delay={0.6}>
      we'll generate 6 faces. pick your favourite
    </Subtitle>
  </div>
);

/* Screen 3: create photos */
const Scene2 = () => (
  <div className="flex flex-col items-center gap-5">
    <BigTitle delay={0.1}>create photos</BigTitle>

    <motion.div
      className="flex w-full max-w-[16rem] flex-col gap-2"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25, duration: 0.3 }}
    >
      {/* fake prompt input */}
      <div
        className="flex h-14 items-center rounded-2xl border-[5px] px-4"
        style={{
          background: "hsl(0 0% 12%)",
          borderColor: "hsl(0 0% 20%)",
        }}
      >
        <Pen size={16} strokeWidth={2.5} color="hsl(0 0% 40%)" />
        <span
          className="ml-3 text-xs font-extrabold lowercase"
          style={{ color: "hsl(0 0% 40%)" }}
        >
          describe your scene...
        </span>
      </div>

      {/* fake generate button */}
      <motion.div
        className="flex h-14 items-center justify-center gap-2 rounded-2xl border-[5px]"
        style={{
          background: "hsl(0 0% 12%)",
          borderColor: "hsl(55 90% 58%)",
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 0.25 }}
      >
        <Zap size={18} strokeWidth={2.5} color="hsl(55 90% 58%)" />
        <span
          className="text-sm font-extrabold lowercase"
          style={{ color: "hsl(55 90% 58%)" }}
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

/* Screen 4: ready? */
const Scene3 = ({ onLetsGo }: { onLetsGo: () => void }) => (
  <div className="flex flex-col items-center gap-6">
    <BigTitle delay={0.1}>ready?</BigTitle>

    <motion.button
      onClick={(e) => {
        e.stopPropagation();
        onLetsGo();
      }}
      className="relative h-16 w-full max-w-[16rem] border-[5px] text-xl font-[900] lowercase tracking-tight"
      style={{
        background: "hsl(55 90% 58%)",
        borderColor: "hsl(55 80% 48%)",
        color: "#000",
        borderRadius: 16,
      }}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      <motion.div
        className="absolute inset-0"
        style={{ borderRadius: 12 }}
        animate={{
          boxShadow: [
            "0 0 0 0 hsl(55 90% 58% / 0.4)",
            "0 0 0 14px hsl(55 90% 58% / 0)",
            "0 0 0 0 hsl(55 90% 58% / 0)",
          ],
        }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2">
        let's go
      </span>
    </motion.button>
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
