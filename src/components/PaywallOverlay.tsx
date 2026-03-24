import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface PaywallOverlayProps {
  open: boolean;
}

const PaywallOverlay = ({ open }: PaywallOverlayProps) => {
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
            <h2 className="text-heading mb-4">you're out of credits</h2>
            <p className="text-muted-foreground text-body-lg mb-8">
              subscribe to keep generating beautiful characters.
            </p>
            <div className="mb-8">
              <span className="text-display-sm">$7</span>
              <p className="text-muted-foreground font-semibold mt-1">first month, then $20/mo</p>
            </div>
            <Button size="xl" variant="hero" className="w-full mb-4">
              subscribe & continue
            </Button>
            <Link to="/" className="text-muted-foreground font-semibold lowercase hover:underline">
              back to home
            </Link>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PaywallOverlay;
