import { useState } from "react";
import { Crown, Zap, Loader2 } from "lucide-react";
import OverlayShell from "./overlay/OverlayShell";
import {
  dotColors,
  BigTitle,
  Subtitle,
  IconPop,
  ParticleBurst,
  GoldButton,
  DismissLink,
} from "./overlay/OverlayPrimitives";

const TOTAL_STEPS = 3;

/* ═══════════════════ SCENES ═══════════════════ */

const Scene0 = () => (
  <div className="flex flex-col items-center gap-3">
    <IconPop delay={0.15} size={96}>
      <Crown size={64} strokeWidth={2} style={{ color: "hsl(55 90% 58%)" }} />
    </IconPop>
    <BigTitle delay={0.25}>unlock vizura</BigTitle>
    <Subtitle delay={0.4}>create unlimited characters and bring any idea to life</Subtitle>
  </div>
);

const Scene1 = () => (
  <div className="flex flex-col items-center gap-3">
    <IconPop delay={0.1} size={96}>
      <Zap size={60} strokeWidth={2} style={{ color: dotColors[1] }} />
    </IconPop>
    <BigTitle delay={0.2}>your imagination, no limits</BigTitle>
    <Subtitle delay={0.35}>
      full access to every style, setting, and detail. generate as many photos as you want
    </Subtitle>
  </div>
);

const Scene2 = ({ burst, buying, onSubscribe, onDismiss }: { burst: boolean; buying: boolean; onSubscribe: () => void; onDismiss: () => void }) => (
  <div className="relative flex flex-col items-center gap-3">
    <ParticleBurst active={burst} />
    <IconPop delay={0.1} size={96}>
      <span className="text-[5rem]">✨</span>
    </IconPop>
    <BigTitle delay={0.2}>$7 first month</BigTitle>
    <Subtitle delay={0.35}>then $20/month. cancel anytime</Subtitle>
    <GoldButton onClick={onSubscribe} disabled={buying} delay={0.2}>
      {buying ? <Loader2 className="animate-spin" size={20} /> : "subscribe"}
    </GoldButton>
    <DismissLink onClick={onDismiss} label="i'll think about it" />
  </div>
);

/* ═══════════════════ MAIN ═══════════════════ */

interface SubscribeOverlayProps {
  open: boolean;
  onDismiss: () => void;
  onSubscribe: () => Promise<void>;
  buying: boolean;
}

const SubscribeOverlay = ({ open, onDismiss, onSubscribe, buying }: SubscribeOverlayProps) => {
  const [burst, setBurst] = useState(false);

  const handleSubscribe = async () => {
    setBurst(true);
    await onSubscribe();
    window.setTimeout(onDismiss, 700);
  };

  return (
    <OverlayShell open={open} totalSteps={TOTAL_STEPS}>
      {(step) => (
        <>
          {step === 0 && <Scene0 />}
          {step === 1 && <Scene1 />}
          {step === 2 && <Scene2 burst={burst} buying={buying} onSubscribe={handleSubscribe} onDismiss={onDismiss} />}
        </>
      )}
    </OverlayShell>
  );
};

export default SubscribeOverlay;
