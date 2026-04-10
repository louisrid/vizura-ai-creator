/**
 * PremiumRipple — pure CSS pulsing ring, no framer-motion.
 */
interface PremiumRippleProps {
  size?: number;
}

const PremiumRipple = ({ size = 120 }: PremiumRippleProps) => {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <span
        className="animate-bounce select-none"
        style={{ fontSize: size * 0.5 }}
      >
        🦊
      </span>
    </div>
  );
};

export default PremiumRipple;
