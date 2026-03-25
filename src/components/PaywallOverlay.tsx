import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
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
        body: { priceId: "price_vizura_monthly" },
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 backdrop-blur-sm px-6"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 8 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-card border border-border rounded-2xl shadow-medium p-8 max-w-sm w-full text-center"
          >
            <p className="text-sm font-bold lowercase text-muted-foreground mb-4">
              start creating for $7/mo
            </p>
            <Button size="lg" variant="hero" className="w-full mb-3" onClick={handleSubscribe} disabled={loading}>
              {loading ? <><Loader2 className="animate-spin" /> loading…</> : "subscribe & generate"}
            </Button>
            <button onClick={onClose} className="w-full text-center text-muted-foreground font-semibold lowercase text-xs hover:underline py-1">
              maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaywallOverlay;
