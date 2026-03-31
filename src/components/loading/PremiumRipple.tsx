/**
 * PremiumRipple — pure CSS pulsing ring, no framer-motion.
 */
interface PremiumRippleProps {
  size?: number;
}

const PremiumRipple = ({ size = 120 }: PremiumRippleProps) => {
  const ringThickness = Math.max(4, Math.round(size * 0.05));

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {/* Halo glow */}
      <div
        className="absolute rounded-full animate-pulse-slow"
        style={{
          width: size * 0.5,
          height: size * 0.5,
          background:
            "radial-gradient(circle, hsl(195 100% 55% / 0.28) 0%, hsl(210 100% 55% / 0.18) 45%, transparent 72%)",
          filter: `blur(${Math.round(size * 0.12)}px)`,
        }}
      />

      {/* Outer ring */}
      <div
        className="absolute rounded-full animate-ring-pulse"
        style={{
          width: size,
          height: size,
          border: `${ringThickness}px solid hsl(195 100% 55%)`,
          boxShadow: `0 0 ${size * 0.18}px hsl(195 100% 55% / 0.26)`,
        }}
      />

      {/* Inner ring */}
      <div
        className="absolute rounded-full animate-pulse-slow"
        style={{
          width: size * 0.36,
          height: size * 0.36,
          border: `${Math.max(2, Math.round(size * 0.022))}px solid hsl(var(--foreground) / 0.18)`,
        }}
      />
    </div>
  );
};

export default PremiumRipple;
