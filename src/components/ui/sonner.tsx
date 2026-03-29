import { AnimatePresence, motion } from "framer-motion";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

type ToastTone = "default" | "success" | "error" | "info" | "warning" | "loading";

type ToastInput = string | { title?: string; description?: string };

type ToastState = {
  id: number;
  message: string;
  tone: ToastTone;
} | null;

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
  const msg = resolveMessage(input);
  console.log("[toast] emit called:", msg, "externalShow:", !!externalShow);
  externalShow?.(msg, tone);
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
  const [currentToast, setCurrentToast] = useState<ToastState>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dismissToast = useCallback(() => {
    setCurrentToast(null);
  }, []);

  const showToast = useCallback((message: string, tone: ToastTone = "default") => {
    if (!message.trim()) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    toastId += 1;
    setCurrentToast({ id: toastId, message, tone });
    timeoutRef.current = setTimeout(() => {
      setCurrentToast(null);
      timeoutRef.current = null;
    }, 2500);
  }, []);

  useEffect(() => {
    externalShow = showToast;
    externalDismiss = dismissToast;
    return () => {
      externalShow = null;
      externalDismiss = null;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [showToast, dismissToast]);

  const value = useMemo(() => ({ toast }), []);

  return (
    <ToastContext.Provider value={value}>
      <div className="pointer-events-none fixed top-[73px] left-0 right-0 z-[9999] mx-auto w-full max-w-lg px-4">
        <div className="flex justify-end">
          <AnimatePresence>
            {currentToast ? (
              <motion.div
                key={currentToast.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.12, ease: "easeOut" } }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="pointer-events-auto inline-flex items-center rounded-[6px] bg-black px-4 py-2.5"
                role="status"
                aria-live="polite"
              >
                <span className="block w-full overflow-hidden text-ellipsis whitespace-nowrap text-left text-sm font-extrabold lowercase leading-none text-white">
                  {currentToast.message}
                </span>
              </motion.div>
            ) : null}
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
