import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";

/* ── shared palette ── */
export const dotColors = [
  "hsl(270 90% 62%)",
  "hsl(210 100% 65%)",
  "hsl(330 95% 58%)",
  "hsl(150 100% 40%)",
  "hsl(240 85% 65%)",
  "hsl(285 80% 60%)",
  "hsl(350 90% 58%)",
];

/* ── progress dots ── */
export const ProgressDots = ({ current, total }: { current: number; total: number }) => (
  <div className="flex items-center justify-center gap-2.5 pt-2 pb-1">
    {Array.from({ length: total }).map((_, i) => (
      <motion.div
        key={i}
        className="rounded-full"
        style={{
          background:
            i === current
              ? "linear-gradient(135deg, hsl(210 100% 70%), hsl(225 100% 58%))"
              : "hsl(0 0% 100% / 0.15)",
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
    style={{ color: "hsl(0 0% 100% / 0.82)" }}
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

/* ── gold CTA button ── */
export const GoldButton = ({
  children,
  onClick,
  disabled,
  delay = 0.2,
}: {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
  delay?: number;
}) => (
  <motion.button
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
    disabled={disabled}
    className="relative mt-5 h-16 w-full rounded-2xl border-[4px] text-xl font-[900] lowercase tracking-tight disabled:opacity-60"
    style={{
      background: "linear-gradient(135deg, hsl(52 100% 58%) 0%, hsl(50 100% 55%) 70%, hsl(44 95% 52%) 100%)",
      borderColor: "hsl(50 100% 54%)",
      color: "#000",
    }}
    whileTap={{ scale: 0.97 }}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.3, delay }}
  >
    <motion.div
      className="absolute inset-0 rounded-xl"
      animate={{
        boxShadow: [
          "0 0 0 0 hsl(52 100% 58% / 0.4)",
          "0 0 0 14px hsl(52 100% 58% / 0)",
          "0 0 0 0 hsl(52 100% 58% / 0)",
        ],
      }}
      transition={{ duration: 1.8, repeat: Infinity }}
    />
    <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
  </motion.button>
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
export const ArrowButton = ({ direction, onClick }: { direction: "left" | "right"; onClick: () => void }) => (
  <motion.button
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    className="flex h-14 w-14 items-center justify-center rounded-2xl border-[4px]"
    style={{ background: "#000", borderColor: "hsl(0 0% 100% / 0.15)" }}
    whileTap={{ scale: 1.12, background: "linear-gradient(135deg, hsl(210 100% 65%), hsl(230 85% 55%))" }}
  >
    {direction === "left" ? (
      <ArrowLeft size={20} strokeWidth={2.5} style={{ color: "#fff" }} />
    ) : (
      <ArrowRight size={20} strokeWidth={2.5} style={{ color: "#fff" }} />
    )}
  </motion.button>
);
