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
      <img
        src={foxEmojiImg}
        alt="🦊"
        className="animate-bounce select-none"
        style={{ width: size * 0.5, height: size * 0.5, objectFit: 'contain' }}
      />
    </div>
  );
};

export default PremiumRipple;
