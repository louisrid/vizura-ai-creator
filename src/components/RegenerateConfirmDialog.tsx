import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

interface RegenerateConfirmDialogProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  message?: string;
}

const RegenerateConfirmDialog = ({
  open,
  onConfirm,
  onCancel,
  loading = false,
  message = "are you sure?\nthis will cost 1 gem",
}: RegenerateConfirmDialogProps) => (
  <AnimatePresence>
    {open && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[9998] flex flex-col items-center justify-center bg-black px-6"
      >
        <motion.div
          className="flex flex-col items-center text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: 0.05 }}
        >
          <h2 className="text-xl font-[900] lowercase text-white leading-[0.95] mb-10 whitespace-pre-line">
            {message}
          </h2>
          <div className="flex gap-3 w-full max-w-xs">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 h-14 text-sm font-[900] lowercase text-black transition-colors active:bg-white/70 disabled:opacity-50"
              style={{ backgroundColor: "#fff", borderRadius: 12 }}
            >
              go back
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 h-14 text-sm font-[900] lowercase text-black transition-colors disabled:opacity-50"
              style={{ backgroundColor: "#facc15", borderRadius: 12 }}
            >
              {loading ? <Loader2 className="animate-spin mx-auto" size={18} /> : "confirm"}
            </button>
          </div>
        </motion.div>
      </motion.div>
    )}
  </AnimatePresence>
);

export default RegenerateConfirmDialog;
