/**
 * PremiumRipple — pure CSS pulsing ring, no framer-motion.
 */
import foxEmojiImg from "@/assets/fox-emoji.png";

interface PremiumRippleProps {
  size?: number;
}

const PremiumRipple = ({ size = 120 }: PremiumRippleProps) => {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <span style={{ fontSize: 28 }}>⚙️</span>
    </div>
  );
};

export default PremiumRipple;
