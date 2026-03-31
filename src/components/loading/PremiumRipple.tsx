import { motion } from "framer-motion";

const RIPPLE_COLORS = [
  "hsl(var(--loader-cyan))",
  "hsl(var(--loader-gold))",
  "hsl(var(--loader-green))",
  "hsl(var(--loader-pink))",
  "hsl(var(--loader-blue))",
];

interface PremiumRippleProps {
  size?: number;
}

const PremiumRipple = ({ size = 120 }: PremiumRippleProps) => {
  const ringThickness = Math.max(4, Math.round(size * 0.05));
  const haloSize = size * 0.5;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <motion.div
        className="absolute rounded-full"
        style={{
          width: haloSize,
          height: haloSize,
          background:
            "radial-gradient(circle, hsl(var(--loader-cyan) / 0.28) 0%, hsl(var(--loader-blue) / 0.18) 45%, transparent 72%)",
          filter: `blur(${Math.round(size * 0.12)}px)`,
        }}
        animate={{
          scale: [0.92, 1.12, 0.92],
          background: [
            "radial-gradient(circle, hsl(var(--loader-cyan) / 0.28) 0%, hsl(var(--loader-blue) / 0.18) 45%, transparent 72%)",
            "radial-gradient(circle, hsl(var(--loader-gold) / 0.28) 0%, hsl(var(--loader-green) / 0.18) 45%, transparent 72%)",
            "radial-gradient(circle, hsl(var(--loader-pink) / 0.28) 0%, hsl(var(--loader-blue) / 0.18) 45%, transparent 72%)",
            "radial-gradient(circle, hsl(var(--loader-cyan) / 0.28) 0%, hsl(var(--loader-blue) / 0.18) 45%, transparent 72%)",
          ],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute rounded-full"
        style={{
          width: size,
          height: size,
          border: `${ringThickness}px solid ${RIPPLE_COLORS[0]}`,
          boxShadow: `0 0 ${size * 0.18}px hsl(var(--loader-cyan) / 0.26)`,
        }}
        animate={{
          scale: [0.88, 1.05, 0.88],
          borderColor: [
            RIPPLE_COLORS[0],
            RIPPLE_COLORS[1],
            RIPPLE_COLORS[2],
            RIPPLE_COLORS[3],
            RIPPLE_COLORS[4],
            RIPPLE_COLORS[0],
          ],
          boxShadow: [
            `0 0 ${size * 0.18}px hsl(var(--loader-cyan) / 0.26)`,
            `0 0 ${size * 0.18}px hsl(var(--loader-gold) / 0.26)`,
            `0 0 ${size * 0.18}px hsl(var(--loader-green) / 0.26)`,
            `0 0 ${size * 0.18}px hsl(var(--loader-pink) / 0.26)`,
            `0 0 ${size * 0.18}px hsl(var(--loader-blue) / 0.26)`,
            `0 0 ${size * 0.18}px hsl(var(--loader-cyan) / 0.26)`,
          ],
        }}
        transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute rounded-full"
        style={{
          width: size * 0.36,
          height: size * 0.36,
          border: `${Math.max(2, Math.round(size * 0.022))}px solid hsl(var(--foreground) / 0.18)`,
        }}
        animate={{ scale: [0.94, 1.04, 0.94] }}
        transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
};

export default PremiumRipple;