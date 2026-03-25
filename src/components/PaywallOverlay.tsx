import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Loader2, Sparkles, Check } from "lucide-react";

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

  const features = [
    "unlimited character generations",
    "all 3 angle views included",
    "priority rendering queue",
    "commercial usage rights",
  ];

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
            className="bg-card border border-border rounded-2xl shadow-medium p-8 md:p-10 max-w-md w-full"
          >
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-xl bg-accent-purple-light flex items-center justify-center mx-auto mb-4">
                <Sparkles size={22} className="text-accent-purple" />
              </div>
              <h2 className="text-heading mb-1">upgrade your plan</h2>
              <p className="text-muted-foreground text-sm font-semibold lowercase">
                unlock unlimited generations
              </p>
            </div>

            <div className="bg-accent rounded-xl p-5 mb-6">
              <div className="flex items-baseline gap-1 justify-center mb-3">
                <span className="text-4xl font-extrabold">$7</span>
                <span className="text-muted-foreground font-semibold text-sm">/first month</span>
              </div>
              <p className="text-center text-muted-foreground font-semibold text-xs">then $20/mo · cancel anytime</p>
            </div>

            <ul className="space-y-2.5 mb-6">
              {features.map((f) => (
                <li key={f} className="flex items-center gap-2.5 text-sm font-bold lowercase">
                  <div className="w-5 h-5 rounded-full bg-accent-purple-light flex items-center justify-center shrink-0">
                    <Check size={12} className="text-accent-purple" />
                  </div>
                  {f}
                </li>
              ))}
            </ul>

            <Button size="lg" variant="hero" className="w-full mb-3" onClick={handleSubscribe} disabled={loading}>
              {loading ? <><Loader2 className="animate-spin" /> loading…</> : "subscribe & continue"}
            </Button>
            <button onClick={onClose} className="w-full text-center text-muted-foreground font-semibold lowercase text-sm hover:underline py-1">
              maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaywallOverlay;
