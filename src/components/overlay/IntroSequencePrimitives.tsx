import { useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

export const LIGHT_BLUE = "hsl(var(--gem-green))";
export const LIGHT_BLUE_SOFT = "hsl(195 100% 78%)";
export const PURE_WHITE = "hsl(0 0% 100%)";

export const IntroDots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center gap-2">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="rounded-full transition-all duration-200"
        style={{
          width: i === current ? 10 : 8,
          height: i === current ? 10 : 8,
          background: i === current ? LIGHT_BLUE : LIGHT_BLUE_SOFT,
        }}
      />
    ))}
  </div>
);

export const IntroNavArrow = ({
  direction,
  onClick,
  onLongPress,
  disabled,
}: {
  direction: "left" | "right";
  onClick: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
}) => {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef(false);

  const startPress = () => {
    firedRef.current = false;
    if (onLongPress) {
      timerRef.current = setTimeout(() => {
        firedRef.current = true;
        onLongPress();
      }, 500);
    }
  };

  const endPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (!firedRef.current && !disabled) onClick();
      }}
      onPointerDown={startPress}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      onPointerLeave={endPress}
      className="flex h-14 w-14 items-center justify-center active:scale-[1.05]"
      style={{
        backgroundColor: direction === "right" ? LIGHT_BLUE : "transparent",
        border: direction === "right" ? `5px solid ${LIGHT_BLUE}` : "none",
        boxShadow: direction === "left" ? `inset 0 0 0 5px ${PURE_WHITE}` : "none",
        borderRadius: 16,
        outline: "none",
        WebkitAppearance: "none",
        appearance: "none",
        padding: 0,
        cursor: disabled ? "default" : "pointer",
        transition: "transform 0.05s",
      }}
    >
      {direction === "left" ? (
        <ArrowLeft size={22} strokeWidth={2.75} style={{ color: PURE_WHITE }} />
      ) : (
        <ArrowRight size={22} strokeWidth={2.5} style={{ color: "hsl(0 0% 0%)" }} />
      )}
    </button>
  );
};

export const IntroScreenTitle = ({ children }: { children: React.ReactNode }) => (
  <motion.h2
    className="mb-0 text-center text-[2.2rem] font-[900] lowercase leading-tight tracking-tight text-white"
    initial={{ opacity: 0, y: 12, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
  >
    {children}
  </motion.h2>
);
