import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

interface RegenerateConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

const RegenerateConfirmDialog = ({
  open,
  onConfirm,
  onCancel,
  loading = false,
  message = "are you sure?",
  confirmLabel = "confirm · 1 gem",
  cancelLabel = "go back",
}: RegenerateConfirmDialogProps) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9998] flex items-center justify-center px-6"
        style={{ backgroundColor: "rgba(0,0,0,0.90)" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 8 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="w-full max-w-xs"
          style={{
            backgroundColor: "#111111",
            borderRadius: 16,
            border: "2px solid #333",
            padding: "28px 24px 24px",
          }}
        >
          <h2 className="text-lg font-[900] lowercase text-white leading-[1.1] mb-6 text-center whitespace-pre-line">
            {message}
          </h2>
          <div className="flex gap-3 w-full">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 h-12 text-sm font-[900] lowercase text-black transition-colors active:bg-white/70 disabled:opacity-50"
              style={{ backgroundColor: "#fff", borderRadius: 12 }}
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 h-12 text-sm font-[900] lowercase text-black transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#facc15", borderRadius: 12 }}
            >
              {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default RegenerateConfirmDialog;
