import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type ToastTone = "default" | "success" | "error" | "info" | "warning" | "loading";

type ToastInput = string | { title?: string; description?: string };

type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: ((input: ToastInput) => void) & {
    success: (input: ToastInput) => void;
    error: (input: ToastInput) => void;
    info: (input: ToastInput) => void;
    warning: (input: ToastInput) => void;
    loading: (input: ToastInput) => void;
    dismiss: () => void;
  };
};

const ToastContext = createContext<ToastContextValue | null>(null);

const resolveMessage = (input: ToastInput) => {
  if (typeof input === "string") return input;
  return input.description || input.title || "";
};

let toastId = 0;
let externalShow: ((message: string, tone?: ToastTone) => void) | null = null;
let externalDismiss: (() => void) | null = null;

const emit = (input: ToastInput, tone: ToastTone = "default") => {
  externalShow?.(resolveMessage(input), tone);
};

const toast = Object.assign(
  (input: ToastInput) => emit(input),
  {
    success: (input: ToastInput) => emit(input, "success"),
    error: (input: ToastInput) => emit(input, "error"),
    info: (input: ToastInput) => emit(input, "info"),
    warning: (input: ToastInput) => emit(input, "warning"),
    loading: (input: ToastInput) => emit(input, "loading"),
    dismiss: () => externalDismiss?.(),
  },
);

export const Toaster = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = "default") => {
    if (!message.trim()) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    toastId += 1;
    const newToast: ToastItem = { id: toastId, message, tone };
    setToasts((prev) => [...prev, newToast]);
    timeoutRef.current = setTimeout(() => {
      setToasts([]);
      timeoutRef.current = null;
    }, 2500);
  }, []);

  useEffect(() => {
    externalShow = showToast;
    externalDismiss = dismissAll;
    return () => {
      externalShow = null;
      externalDismiss = null;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [showToast, dismissAll]);

  const value = useMemo(() => ({ toast }), []);

  return (
    <ToastContext.Provider value={value}>
      <div className="pointer-events-none fixed top-24 left-0 right-0 z-[99999] mx-auto w-full max-w-lg px-4">
        <div className="flex flex-col items-end gap-2">
          <AnimatePresence>
            {toasts.map((t) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 80, transition: { duration: 0.45, ease: "easeIn" } }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="pointer-events-auto inline-flex items-center rounded-2xl px-4 py-2.5"
                style={{ backgroundColor: "hsl(140 100% 50%)", color: "hsl(140 60% 15%)" }}
                role="status"
                aria-live="polite"
              >
                <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-left text-sm font-extrabold lowercase leading-none">
                  {t.message}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  return context ?? { toast };
};

export { toast };
