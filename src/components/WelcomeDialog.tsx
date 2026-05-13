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
          className="fixed inset-0 z-[10000] flex items-center justify-center"
          style={{ backgroundColor: "rgba(0,0,0,0.83)", backdropFilter: "blur(4px)", padding: 10 }}
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
            className="relative w-full h-full flex flex-col"
            style={{
              backgroundColor: "hsl(var(--card))",
              border: "2px solid hsl(var(--border-mid))",
              borderRadius: 14,
              padding: 10,
              boxShadow: "0 24px 60px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.02) inset",
            }}
          >
            <ModalCloseButton onClick={onClose} aria-label="dismiss welcome" />

            <div className="flex items-center justify-center gap-[8px] pt-[10px] pb-[6px]">
              <Sparkles size={22} strokeWidth={3} style={{ color: "#ffe603" }} />
              <h2
                id="welcome-dialog-title"
                className="text-[28px] leading-none lowercase text-white text-center"
                style={{ fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif", fontWeight: 900, letterSpacing: "-0.7px" }}
              >
                welcome to facebox
              </h2>
            </div>

            <p
              className="text-[15px] lowercase text-white text-center pb-[10px]"
              style={{ fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif", fontWeight: 600, letterSpacing: "-0.2px" }}
            >
              let's create your first ai character
            </p>

            <div
              className="flex-1 relative w-full overflow-hidden mb-[10px] min-h-0"
              style={{ borderRadius: 10, backgroundColor: "#000" }}
            >
              <div
                className="absolute inset-0 flex"
                style={{
                  width: "600%",
                  animation: "welcome-slide 18s linear infinite",
                  willChange: "transform",
                }}
              >
                {[1, 2, 3, 1, 2, 3].map((n, i) => (
                  <div key={i} className="relative h-full" style={{ width: "16.6666%" }}>
                    <img
                      src={`/welcome/${n}.jpg`}
                      alt=""
                      className="absolute inset-0 h-full w-full object-cover"
                      loading="eager"
                      draggable={false}
                    />
                  </div>
                ))}
              </div>
              <style>{`@keyframes welcome-slide { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
            </div>

            <button
              ref={startBtnRef}
              type="button"
              onClick={onStart}
              className="flex items-center justify-center w-full select-none shrink-0"
              style={{
                backgroundColor: "#ffe603",
                border: "2px solid #ffe603",
                borderRadius: 10,
                height: 56,
                fontFamily: "-apple-system, 'SF Pro Display', system-ui, sans-serif",
                fontWeight: 900,
                fontSize: 17,
                color: "#000000",
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
