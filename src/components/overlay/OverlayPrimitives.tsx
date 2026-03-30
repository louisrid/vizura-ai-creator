import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
export const LIGHT_BLUE = "hsl(195 100% 50%)";
const LIGHT_BLUE_SOFT = "hsl(195 100% 78%)";
const PURE_WHITE = "hsl(0 0% 100%)";

export const dotColors = [
  "hsl(50 100% 50%)",
  "hsl(140 100% 45%)",
  "hsl(330 100% 50%)",
  "hsl(210 100% 50%)",
  "hsl(280 100% 55%)",
  "hsl(15 100% 50%)",
  "hsl(0 100% 50%)",
];

/* ── progress dots — matches IntroDots ── */
export const ProgressDots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center justify-center gap-3 pt-2 pb-1">
    {Array.from({ length: total }).map((_, i) => (
      <div
        key={i}
        className="rounded-full"
        style={{
          background: i === current ? LIGHT_BLUE : LIGHT_BLUE_SOFT,
          width: i === current ? 14 : 10,
          height: i === current ? 14 : 10,
          transition: "width 0.15s, height 0.15s, background 0.15s",
        }}
      />
    ))}
  </div>
);

/* ── big title ── */
export const BigTitle = ({ children, delay = 0.1 }: { children: React.ReactNode; delay?: number }) => (
  <h2
    className="text-center text-[2rem] font-[900] lowercase leading-[1.1] tracking-tight"
    style={{ color: "hsl(0 0% 100%)" }}
  >
    {children}
  </h2>
);

/* ── subtitle ── */
export const Subtitle = ({ children, delay = 0.2 }: { children: React.ReactNode; delay?: number }) => (
  <p
    className="max-w-[18rem] text-center text-[0.94rem] font-bold lowercase leading-snug"
    style={{ color: "hsl(0 0% 100% / 0.92)" }}
  >
    {children}
  </p>
);

/* ── icon pop ── */
export const IconPop = ({ children, delay = 0.15, size = 56 }: { children: React.ReactNode; delay?: number; size?: number }) => (
  <div
    className="flex items-center justify-center"
    style={{ width: size, height: size }}
  >
    <motion.div
      animate={{ y: [0, -4, 0], scale: [1, 1.05, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  </div>
);

/* ── particle burst ── */
export const ParticleBurst = ({ active }: { active: boolean }) => {
  const particles = useMemo(
    () =>
      Array.from({ length: 18 }).map((_, i) => ({
        angle: (i / 18) * Math.PI * 2,
        dist: 50 + ((i * 17) % 60),
        color: dotColors[i % dotColors.length],
      })),
    [],
  );
  if (!active) return null;
  return (
    <div className="pointer-events-none absolute inset-0">
      {particles.map((p, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{ left: "50%", top: "50%", width: 7, height: 7, background: p.color }}
          initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
          animate={{
            x: Math.cos(p.angle) * p.dist * 1.8,
            y: Math.sin(p.angle) * p.dist * 1.8,
            opacity: 0,
            scale: 0,
          }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        />
      ))}
    </div>
  );
};

/* ── neon green CTA button ── */
export const GoldButton = ({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  delay?: number;
}) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
    disabled={disabled}
    className="relative mt-5 h-16 w-full border-[5px] text-xl font-[900] lowercase tracking-tight disabled:opacity-60 active:scale-[0.93]"
    style={{
      background: "hsl(var(--neon-yellow))",
      borderColor: "hsl(var(--neon-yellow))",
      color: "#000",
      borderRadius: 16,
      transition: "transform 0.05s",
    }}
  >
    <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
  </button>
);

/* ── dismiss link ── */
export const DismissLink = ({ onClick, label = "maybe later", delay = 0.5, className = "" }: { onClick: (e: React.MouseEvent) => void; label?: string; delay?: number; className?: string }) => (
  <button
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
    className={`mt-2 text-[0.6rem] font-bold lowercase underline underline-offset-4 ${className}`}
    style={{ color: "hsl(0 0% 100% / 0.25)" }}
  >
    {label}
  </button>
);

/* ── swipe hint ── */
export const SwipeHint = () => (
  <p
    className="text-xs font-bold lowercase"
    style={{ color: "hsl(0 0% 100% / 0.3)" }}
  >
    press arrow to continue
  </p>
);

/* ── arrow nav buttons — matches IntroNavArrow ── */
export const ArrowButton = ({
  direction,
  onClick,
  disabled,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
}: {
  direction: "left" | "right";
  onClick?: () => void;
  disabled?: boolean;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
}) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    onPointerDown={onPointerDown}
    onPointerUp={onPointerUp}
    onPointerLeave={onPointerLeave}
    disabled={disabled}
    className="flex h-14 w-14 items-center justify-center active:scale-[1.05]"
    style={{
      backgroundColor: direction === "right" ? LIGHT_BLUE : "transparent",
      border: direction === "right" ? `5px solid ${LIGHT_BLUE}` : "none",
      boxShadow: direction === "left" ? `inset 0 0 0 5px ${PURE_WHITE}` : "none",
      borderRadius: 16,
      outline: "none",
      cursor: disabled ? "default" : "pointer",
      opacity: disabled ? 0.3 : 1,
      transition: "transform 0.05s, opacity 0.15s",
    }}
  >
    {direction === "left" ? (
      <ArrowLeft size={22} strokeWidth={2.75} style={{ color: PURE_WHITE }} />
    ) : (
      <ArrowRight size={22} strokeWidth={2.5} style={{ color: "hsl(0 0% 0%)" }} />
    )}
  </button>
);
