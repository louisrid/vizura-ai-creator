import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Gem } from "lucide-react";
import ModalCloseButton from "@/components/ModalCloseButton";

interface RegenerateConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** When true, confirm button uses gem-box style (blue border/text). When false, uses yellow. */
  gemCost?: boolean;
}

const RegenerateConfirmDialog = ({
  open,
  onConfirm,
  onCancel,
  loading = false,
  message = "are you sure?",
  confirmLabel = "yes • 1",
  cancelLabel = "no",
  gemCost = true,
}: RegenerateConfirmDialogProps) => {
  // Dismiss on swipe-back gesture
  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      e.preventDefault();
      onCancel();
    };
    window.addEventListener("vizura:swipe-back", handler);
    return () => window.removeEventListener("vizura:swipe-back", handler);
  }, [open, onCancel]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="fixed inset-0 z-[9998] flex items-center justify-center px-5"
          style={{ backgroundColor: "rgba(0,0,0,0.83)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="relative w-full max-w-sm"
            style={{
              backgroundColor: "#000000",
              borderRadius: 10,
              border: "2px solid #1a1a1a",
              padding: "28px 24px 24px",
            }}
          >
            <ModalCloseButton onClick={onCancel} />

            <h2 className="text-lg font-[900] lowercase text-white leading-[1.1] mb-5 text-center whitespace-pre-line">
              {message}
            </h2>
            <div className="flex gap-3 w-full">
              <button
                onClick={onCancel}
                disabled={loading}
                className="flex-1 h-12 text-sm font-[900] lowercase text-white transition-colors active:opacity-70 disabled:opacity-50"
                style={{ backgroundColor: "#1a1a1a", borderRadius: 10 }}
              >
                no
              </button>
              {gemCost ? (
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex-1 h-12 text-sm font-[900] lowercase transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: "#050a10", borderRadius: 10, border: "2px solid #00e0ff", color: "#ffffff" }}
                >
                  {loading ? (
                    <Loader2 className="animate-spin mx-auto" size={18} />
                  ) : (
                    <>
                      {confirmLabel}
                      <Gem size={13} strokeWidth={2.5} style={{ color: "#00e0ff" }} />
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={onConfirm}
                  disabled={loading}
                  className="flex-1 h-12 text-sm font-[900] lowercase text-black transition-colors disabled:opacity-50"
                  style={{ backgroundColor: "#ffe603", borderRadius: 10 }}
                >
                  {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : confirmLabel}
                </button>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RegenerateConfirmDialog;
