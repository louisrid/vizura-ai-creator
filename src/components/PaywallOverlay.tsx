import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import OverlayShell from "./overlay/OverlayShell";
import {
  BigTitle,
  Subtitle,
  IconPop,
  ParticleBurst,
  GoldButton,
  DismissLink,
} from "./overlay/OverlayPrimitives";

interface PaywallOverlayProps {
  open: boolean;
  onClose: () => void;
  /** If true, user has subscription but no credits — show top-ups instead */
  hasSubscription?: boolean;
}

const PaywallOverlay = ({ open, onClose, hasSubscription = false }: PaywallOverlayProps) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [burst, setBurst] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    setBurst(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { type: "membership" },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (e) {
      console.error("Checkout error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleTopUps = () => {
    onClose();
    navigate("/top-ups");
  };

  if (hasSubscription) {
    return (
      <OverlayShell open={open} totalSteps={1} showNav={false}>
        {() => (
          <div className="relative flex flex-col items-center gap-3">
            <IconPop delay={0.15} size={96}>
              <span className="text-[5rem]">⚡</span>
            </IconPop>
            <BigTitle delay={0.25}>out of credits</BigTitle>
            <Subtitle delay={0.4}>top up your balance to keep creating</Subtitle>
            <GoldButton onClick={handleTopUps} delay={0.2}>
              buy credits
            </GoldButton>
            <DismissLink onClick={onClose} />
          </div>
        )}
      </OverlayShell>
    );
  }

  return (
    <OverlayShell open={open} totalSteps={1} showNav={false}>
      {() => (
        <div className="relative flex flex-col items-center gap-3">
          <ParticleBurst active={burst} />
          <IconPop delay={0.15} size={96}>
            <span className="text-[5rem]">✨</span>
          </IconPop>
          <BigTitle delay={0.25}>$7 first month</BigTitle>
          <Subtitle delay={0.4}>then $20/month · 50 credits per month</Subtitle>
          <GoldButton onClick={handleSubscribe} disabled={loading} delay={0.2}>
            {loading ? <><Loader2 className="animate-spin" size={20} /> loading...</> : "subscribe & create"}
          </GoldButton>
          <DismissLink onClick={onClose} />
        </div>
      )}
    </OverlayShell>
  );
};

export default PaywallOverlay;
