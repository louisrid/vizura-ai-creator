import { useState } from "react";
import { Crown, Gem, Loader2 } from "lucide-react";
import { motion } from "framer-motion";
import OverlayShell from "./overlay/OverlayShell";
import { GoldButton, DismissLink } from "./overlay/OverlayPrimitives";
import { IntroScreenTitle } from "./overlay/IntroSequencePrimitives";

const TOTAL_STEPS = 3;

const IntroStyleShell = ({
  emoji,
  title,
  subtitle,
  children,
}: {
  emoji: React.ReactNode;
  title: React.ReactNode;
  subtitle: React.ReactNode;
  children?: React.ReactNode;
}) => (
  <div className="relative flex w-full flex-col items-center">
    <div className="flex h-12 items-end justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: [0, 1.4, 0.9, 1] }}
        transition={{ delay: 0.05, duration: 0.5, ease: [0.2, 0.9, 0.2, 1] }}
      >
        <motion.div
          className="inline-flex items-center justify-center"
          animate={{ y: [0, -7, 2, 0], rotate: [0, -8, 5, 0], scale: [1, 1.05, 0.97, 1] }}
          transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut", delay: 0.55 }}
        >
          {emoji}
        </motion.div>
      </motion.div>
    </div>
    <div className="mt-1.5 flex w-full flex-col items-center">
      <IntroScreenTitle>{title}</IntroScreenTitle>
      <motion.p
        className="mt-3 max-w-[18rem] text-center text-[0.94rem] font-bold lowercase leading-snug"
        style={{ color: "hsl(0 0% 100% / 0.92)" }}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, delay: 0.35, ease: "easeOut" }}
      >
        {subtitle}
      </motion.p>
      {children ? <div className="mt-3 flex w-full flex-col items-center">{children}</div> : null}
    </div>
  </div>
);

const Scene0 = () => (
  <IntroStyleShell
    emoji={<Crown size={64} strokeWidth={2} style={{ color: "hsl(55 90% 58%)" }} />}
    title="unlock vizura"
    subtitle="create unlimited characters and bring any idea to life"
  />
);

const Scene1 = () => (
  <IntroStyleShell
    emoji={<Gem size={60} strokeWidth={2} style={{ color: "hsl(var(--gem-green))" }} />}
    title="your imagination, no limits"
    subtitle="full access to every style, setting, and detail. generate as many photos as you want"
  />
);

const Scene2 = ({ buying, onSubscribe, onDismiss }: { buying: boolean; onSubscribe: () => void; onDismiss: () => void }) => (
  <IntroStyleShell
    emoji={<span className="text-[3.5rem]">✨</span>}
    title="$7 first month"
    subtitle="then $20/month. cancel anytime"
  >
    <GoldButton onClick={onSubscribe} disabled={buying}>
      {buying ? <Loader2 className="animate-spin" size={20} /> : "subscribe"}
    </GoldButton>
    <DismissLink onClick={onDismiss} label="i'll think about it" className="mt-6 text-[0.65rem]" />
  </IntroStyleShell>
);

interface SubscribeOverlayProps {
  open: boolean;
  onDismiss: () => void;
  onSubscribe: () => Promise<void>;
  buying: boolean;
}

const SubscribeOverlay = ({ open, onDismiss, onSubscribe, buying }: SubscribeOverlayProps) => {
  const handleSubscribe = async () => {
    await onSubscribe();
    window.setTimeout(onDismiss, 700);
  };

  return (
    <OverlayShell open={open} totalSteps={TOTAL_STEPS}>
      {(step) => (
        <>
          {step === 0 && <Scene0 />}
          {step === 1 && <Scene1 />}
          {step === 2 && <Scene2 buying={buying} onSubscribe={handleSubscribe} onDismiss={onDismiss} />}
        </>
      )}
    </OverlayShell>
  );
};

export default SubscribeOverlay;
