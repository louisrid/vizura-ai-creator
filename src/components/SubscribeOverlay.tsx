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
        className="inline-flex items-center justify-center"
        animate={{ y: [0, -18, 4, 0], rotate: [0, -10, 6, 0], scale: [1, 1.12, 0.96, 1] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {emoji}
      </motion.div>
    </div>
    <div className="mt-1.5 flex w-full flex-col items-center">
      <IntroScreenTitle>{title}</IntroScreenTitle>
      <p
        className="mt-3 max-w-[18rem] text-center text-[0.94rem] font-bold lowercase leading-snug"
        style={{ color: "hsl(0 0% 100% / 0.92)" }}
      >
        {subtitle}
      </p>
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

const Scene2 = ({ buying, onSubscribe }: { buying: boolean; onSubscribe: () => void }) => (
  <IntroStyleShell
    emoji={<span className="text-[3.5rem]">✨</span>}
    title="$7 first month"
    subtitle="then $20/month. cancel anytime"
  >
    <GoldButton onClick={onSubscribe} disabled={buying}>
      {buying ? <Loader2 className="animate-spin" size={20} /> : "subscribe"}
    </GoldButton>
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
  };

  return (
    <OverlayShell
      open={open}
      totalSteps={TOTAL_STEPS}
      onLongPressSkip={handleSubscribe}
      onDismiss={onDismiss}
      bottomContent={
        <DismissLink onClick={(e) => { e.stopPropagation(); onDismiss(); }} label="i'll think about it" className="text-[0.65rem]" />
      }
    >
      {(step) => (
        <>
          {step === 0 && <Scene0 />}
          {step === 1 && <Scene1 />}
          {step === 2 && <Scene2 buying={buying} onSubscribe={handleSubscribe} />}
        </>
      )}
    </OverlayShell>
  );
};

export default SubscribeOverlay;
