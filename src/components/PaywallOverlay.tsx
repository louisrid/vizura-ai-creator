import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Loader2 } from "lucide-react";

interface PaywallOverlayProps {
  open: boolean;
  onClose: () => void;
}

const PaywallOverlay = ({ open, onClose }: PaywallOverlayProps) => {
  const [loading, setLoading] = useState(false);

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { priceId: "price_vizura_monthly" }, // Replace with real Stripe price ID
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

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/90 px-6"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-background border-2 border-foreground p-10 md:p-14 max-w-lg w-full text-center"
          >
            <h2 className="text-heading mb-4">credit balance depleted</h2>
            <p className="text-muted-foreground text-body-lg mb-8">
              subscribe to replenish your allocation & restore access to the rendering pipeline without throttling.
            </p>
            <div className="mb-8">
              <span className="text-display-sm">$7</span>
              <p className="text-muted-foreground font-semibold mt-1">introductory price for your first month, then $20 per month after</p>
            </div>
            <Button size="xl" variant="hero" className="w-full mb-4" onClick={handleSubscribe} disabled={loading}>
              {loading ? <><Loader2 className="animate-spin" /> loading…</> : "subscribe & continue"}
            </Button>
            <button onClick={onClose} className="text-muted-foreground font-semibold lowercase hover:underline">
              close
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaywallOverlay;
