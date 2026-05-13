import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles } from "@/lib/icons";
import ModalCloseButton from "@/components/ModalCloseButton";
import { AspectRatio } from "@/components/ui/aspect-ratio";

interface WelcomeDialogProps {
  open: boolean;
  onClose: () => void;
  onStart: () => void;
}

const WelcomeDialog = ({ open, onClose, onStart }: WelcomeDialogProps) => {
  const startBtnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      const t = setTimeout(() => startBtnRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[10000] flex items-center justify-center px-5"
          style={{ backgroundColor: "rgba(0,0,0,0.83)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="welcome-dialog-title"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[380px]"
            style={{
              backgroundColor: "hsl(var(--card))",
              border: "2px solid hsl(var(--border-mid))",
              borderRadius: 10,
              padding: "26px 22px 22px",
            }}
          >
            <ModalCloseButton onClick={onClose} aria-label="dismiss welcome" />

            <div className="flex items-center justify-center gap-2 mb-1">
              <Sparkles size={18} strokeWidth={3} style={{ color: "#ffe603" }} />
              <h2
                id="welcome-dialog-title"
                className="text-[22px] leading-none lowercase text-white text-center"
                style={{ fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif", fontWeight: 900, letterSpacing: "-0.5px" }}
              >
                welcome to facebox
              </h2>
            </div>

            <p
              className="text-[14px] lowercase text-white text-center mt-2 mb-5"
              style={{ fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif", fontWeight: 700, letterSpacing: "-0.2px" }}
            >
              let's create your first ai character
            </p>

            <div className="grid grid-cols-3 gap-2 mb-5">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  style={{ borderRadius: 10, overflow: "hidden", border: "2px solid hsl(var(--border-mid))" }}
                >
                  <AspectRatio ratio={3 / 4}>
                    <img
                      src={`/welcome/${n}.jpg`}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="eager"
                      draggable={false}
                    />
                  </AspectRatio>
                </div>
              ))}
            </div>

            <button
              ref={startBtnRef}
              type="button"
              onClick={onStart}
              className="flex items-center justify-center w-full select-none"
              style={{
                backgroundColor: "#000000",
                border: "2px solid #ffe603",
                borderRadius: 10,
                height: 48,
                fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif",
                fontWeight: 900,
                fontSize: 16,
                color: "#ffffff",
                letterSpacing: "-0.3px",
                textTransform: "lowercase",
              }}
            >
              let's go!
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WelcomeDialog;
