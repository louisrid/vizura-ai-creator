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
  const rings = [0, 1, 2, 3, 4];
  const ringSize = size * 0.18;
  const centerSize = size * 0.1;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      {rings.map((ring) => (
        <motion.div
          key={ring}
          className="absolute rounded-full"
          style={{
            width: ringSize,
            height: ringSize,
            top: "50%",
            left: "50%",
            marginTop: -(ringSize / 2),
            marginLeft: -(ringSize / 2),
            border: `2.5px solid ${RIPPLE_COLORS[ring % RIPPLE_COLORS.length]}`,
            opacity: 0.98,
          }}
          animate={{
            scale: [1, 3.2, 5.4],
            borderColor: [
              RIPPLE_COLORS[ring % RIPPLE_COLORS.length],
              RIPPLE_COLORS[(ring + 1) % RIPPLE_COLORS.length],
              RIPPLE_COLORS[(ring + 2) % RIPPLE_COLORS.length],
              RIPPLE_COLORS[(ring + 3) % RIPPLE_COLORS.length],
            ],
          }}
          transition={{
            duration: 4.6,
            repeat: Infinity,
            delay: ring * 0.72,
            ease: "linear",
          }}
        />
      ))}

      <motion.div
        className="absolute rounded-full"
        style={{
          width: centerSize,
          height: centerSize,
          opacity: 1,
          backgroundColor: RIPPLE_COLORS[0],
          boxShadow: `0 0 ${size * 0.16}px ${RIPPLE_COLORS[0]}`,
        }}
        animate={{
          scale: [1, 1.18, 1],
          backgroundColor: [
            RIPPLE_COLORS[0],
            RIPPLE_COLORS[1],
            RIPPLE_COLORS[2],
            RIPPLE_COLORS[3],
            RIPPLE_COLORS[4],
            RIPPLE_COLORS[0],
          ],
          boxShadow: [
            `0 0 ${size * 0.16}px ${RIPPLE_COLORS[0]}`,
            `0 0 ${size * 0.18}px ${RIPPLE_COLORS[1]}`,
            `0 0 ${size * 0.18}px ${RIPPLE_COLORS[2]}`,
            `0 0 ${size * 0.18}px ${RIPPLE_COLORS[3]}`,
            `0 0 ${size * 0.18}px ${RIPPLE_COLORS[4]}`,
            `0 0 ${size * 0.16}px ${RIPPLE_COLORS[0]}`,
          ],
        }}
        transition={{ duration: 7.2, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
};

export default PremiumRipple;