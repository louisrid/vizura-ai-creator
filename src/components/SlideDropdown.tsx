import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

export interface SlideDropdownOption {
  value: string;
  label: string;
}

interface SlideDropdownProps {
  label: string;
  value: string;
  options: readonly SlideDropdownOption[];
  onChange: (v: string) => void;
}

/**
 * Press-and-slide dropdown — matches the gesture of the Header menu.
 * Tap the trigger to open, slide a finger over options to highlight,
 * release on an option to select. Tap-to-close also supported.
 */
const SlideDropdown = ({ label, value, options, onChange }: SlideDropdownProps) => {
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; width: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const wasOpenAtStartRef = useRef(false);

  const selected = options.find((o) => o.value === value) ?? options[0];

  const updatePos = useCallback(() => {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, updatePos]);

  // Outside click close
  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      const target = e.target as Node;
      if (btnRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
      setHighlight(null);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [open]);

  const handleSelect = (idx: number) => {
    const opt = options[idx];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
    setHighlight(null);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!open) return;
    const elUnder = document.elementFromPoint(e.clientX, e.clientY);
    const itemEl = elUnder ? (elUnder as Element).closest('[data-dropdown-idx]') as HTMLElement | null : null;
    setHighlight(itemEl ? Number(itemEl.getAttribute('data-dropdown-idx')) : null);
  };

  const handlePointerEnd = (e: React.PointerEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    if (btn.hasPointerCapture(e.pointerId)) btn.releasePointerCapture(e.pointerId);
    if (e.type === "pointercancel") {
      setHighlight(null);
      return;
    }
    const elUnder = document.elementFromPoint(e.clientX, e.clientY);
    const itemEl = elUnder ? (elUnder as Element).closest('[data-dropdown-idx]') as HTMLElement | null : null;
    if (itemEl) {
      handleSelect(Number(itemEl.getAttribute('data-dropdown-idx')));
      return;
    }
    const releasedOnButton = !!elUnder && btn.contains(elUnder as Node);
    if (releasedOnButton) {
      if (wasOpenAtStartRef.current) {
        setOpen(false);
        setHighlight(null);
      }
      return;
    }
    setOpen(false);
    setHighlight(null);
  };

  const dropdown = pos ? createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          ref={dropdownRef}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12, ease: "easeOut" }}
          className="fixed overflow-hidden"
          style={{
            top: pos.top,
            left: pos.left,
            width: pos.width,
            zIndex: 10001,
            borderRadius: 9,
            border: "2px solid hsl(var(--border-mid))",
            backgroundColor: "#000000",
            boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
          }}
        >
          {options.map((opt, idx) => (
            <div key={opt.value}>
              {idx > 0 && <div style={{ height: 2, backgroundColor: "hsl(var(--border-mid))" }} />}
              <button
                type="button"
                data-dropdown-idx={idx}
                onClick={() => handleSelect(idx)}
                className="w-full flex items-center px-4 py-3 text-base font-[900] lowercase"
                style={{
                  color: value === opt.value ? "#ffe603" : "#ffffff",
                  backgroundColor: highlight === idx ? "hsl(var(--border-mid))" : "transparent",
                  touchAction: "none",
                }}
              >
                {opt.label}
              </button>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  ) : null;

  return (
    <div className="flex-1">
      <span className="block text-lg md:text-xl font-[900] lowercase mb-2 text-white">{label}</span>
      <div className="relative">
        <button
          ref={btnRef}
          type="button"
          onPointerDown={(e) => {
            if (e.button !== 0) return;
            e.currentTarget.setPointerCapture(e.pointerId);
            wasOpenAtStartRef.current = open;
            if (!open) setOpen(true);
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          className="flex w-full items-center gap-3 h-14 md:h-16 px-4"
          style={{ borderRadius: 9, backgroundColor: "#ffe603", touchAction: "none" }}
        >
          <span className="flex-1 text-left text-base md:text-lg font-[900] lowercase text-black">{selected.label}</span>
          <ChevronDown
            size={18}
            strokeWidth={2.5}
            className={`text-black/40 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>
      {dropdown}
    </div>
  );
};

export default SlideDropdown;
