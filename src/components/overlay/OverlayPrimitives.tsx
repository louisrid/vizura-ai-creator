import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

/* ── shared palette ── */
export const dotColors = [
  "hsl(55 100% 50%)",
  "hsl(130 100% 42%)",
  "hsl(330 95% 58%)",
  "hsl(200 100% 50%)",
  "hsl(280 85% 60%)",
  "hsl(20 100% 55%)",
  "hsl(0 90% 55%)",
];

/* ── progress dots ── */
export const ProgressDots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center justify-center gap-2.5 pt-2 pb-1">
    {Array.from({ length: total }).map((_, i) => (
      <motion.div
        key={i}
        className="rounded-full"
        style={{
          borderRadius: 9999,
          background: i === current ? "hsl(55 90% 58%)" : "hsl(0 0% 100% / 0.15)",
        }}
        animate={{
          width: i === current ? 14 : 10,
          height: i === current ? 14 : 10,
        }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    ))}
  </div>
);

/* ── big title ── */
export const BigTitle = ({ children, delay = 0.1 }: { children: React.ReactNode; delay?: number }) => (
  <motion.h2
    className="text-center text-[2rem] font-[900] lowercase leading-[1.1] tracking-tight"
    style={{ color: "hsl(0 0% 100%)" }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay, ease: [0.2, 0.9, 0.2, 1] }}
  >
    {children}
  </motion.h2>
);

/* ── subtitle ── */
export const Subtitle = ({ children, delay = 0.2 }: { children: React.ReactNode; delay?: number }) => (
  <motion.p
    className="max-w-[18rem] text-center text-[0.94rem] font-bold lowercase leading-snug"
    style={{ color: "hsl(0 0% 100% / 0.92)" }}
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, delay, ease: "easeOut" }}
  >
    {children}
  </motion.p>
);

/* ── icon pop ── */
export const IconPop = ({ children, delay = 0.15, size = 56 }: { children: React.ReactNode; delay?: number; size?: number }) => (
  <motion.div
    className="flex items-center justify-center"
    style={{ width: size, height: size }}
    initial={{ opacity: 0, scale: 0 }}
    animate={{ opacity: 1, scale: [0, 1.3, 0.9, 1] }}
    transition={{ duration: 0.4, delay, ease: [0.2, 0.9, 0.2, 1] }}
  >
    <motion.div
      animate={{ y: [0, -4, 0], scale: [1, 1.05, 1] }}
      transition={{ duration: 2.5, delay: delay + 0.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {children}
    </motion.div>
  </motion.div>
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
      background: "hsl(140 70% 52%)",
      borderColor: "hsl(140 70% 58%)",
      color: "#fff",
      borderRadius: 16,
      transition: "transform 0.05s",
    }}
  >
    <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
  </button>
);

/* ── dismiss link ── */
export const DismissLink = ({ onClick, label = "maybe later", delay = 0.5 }: { onClick: (e: React.MouseEvent) => void; label?: string; delay?: number }) => (
  <motion.button
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
    className="mt-2 text-xs font-extrabold lowercase underline underline-offset-4"
    style={{ color: "hsl(0 0% 100% / 0.4)" }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3, delay }}
  >
    {label}
  </motion.button>
);

/* ── swipe hint ── */
export const SwipeHint = () => (
  <motion.p
    className="text-[11px] font-bold lowercase"
    style={{ color: "hsl(0 0% 100%)" }}
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.2, delay: 0.3 }}
  >
    swipe or tap arrow
  </motion.p>
);

/* ── arrow nav buttons ── */
export const ArrowButton = ({
  direction,
  onClick,
  onPointerDown,
  onPointerUp,
  onPointerLeave,
}: {
  direction: "left" | "right";
  onClick?: () => void;
  onPointerDown?: () => void;
  onPointerUp?: () => void;
  onPointerLeave?: () => void;
}) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
    onPointerDown={onPointerDown}
    onPointerUp={onPointerUp}
    onPointerLeave={onPointerLeave}
    className={`flex h-14 w-14 items-center justify-center rounded-2xl border-[4px] active:scale-[1.12] ${direction === "right" ? "bg-[hsl(55,90%,58%)]" : "bg-black active:bg-[hsl(55,90%,58%)]"}`}
    style={{ borderColor: direction === "right" ? "hsl(55 80% 48%)" : "hsl(0 0% 100% / 0.15)", borderRadius: 16, transition: "transform 0.05s, background-color 0.05s" }}
  >
    {direction === "left" ? (
      <ArrowLeft size={20} strokeWidth={2.5} style={{ color: "#fff" }} />
    ) : (
      <ArrowRight size={20} strokeWidth={2.5} style={{ color: "#fff" }} />
    )}
  </button>
);
