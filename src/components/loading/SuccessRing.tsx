import { motion } from "framer-motion";

interface SuccessRingProps {
  color?: string;
  size?: number;
  strokeWidth?: number;
}

const SuccessRing = ({
  color = "hsl(var(--foreground))",
  size = 120,
  strokeWidth = 6,
}: SuccessRingProps) => {
  const center = size / 2;
  const radius = center - strokeWidth * 2;
  const tick = `M${size * 0.32} ${size * 0.53} L${size * 0.45} ${size * 0.67} L${size * 0.7} ${size * 0.38}`;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      initial={{ opacity: 0, scale: 0.72 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.38, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <motion.circle
        cx={center}
        cy={center}
        r={radius}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 1 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: "easeInOut" }}
      />
      <motion.path
        d={tick}
        stroke={color}
        strokeWidth={strokeWidth + 1}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        initial={{ pathLength: 0, opacity: 1 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.9, ease: "easeInOut" }}
      />
    </motion.svg>
  );
};

export default SuccessRing;