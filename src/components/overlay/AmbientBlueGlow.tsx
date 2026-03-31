import { motion } from "framer-motion";

const AmbientBlueGlow = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <motion.div
      className="absolute rounded-full"
      style={{
        width: "100%",
        height: "92%",
        top: "-10%",
        left: "-10%",
        filter: "blur(118px)",
        background:
          "radial-gradient(circle, hsl(var(--ambient-blue-1) / 0.1) 0%, hsl(var(--ambient-blue-2) / 0.05) 42%, transparent 72%)",
      }}
      animate={{ x: [0, 90, -45, 55, -35, 0], y: [0, -60, 40, -30, 25, 0], scale: [1, 1.22, 0.92, 1.14, 0.96, 1] }}
      transition={{ duration: 22, repeat: Infinity, ease: "linear" }}
    />
    <motion.div
      className="absolute rounded-full"
      style={{
        width: "82%",
        height: "78%",
        right: "-12%",
        bottom: "-12%",
        filter: "blur(104px)",
        background:
          "radial-gradient(circle, hsl(var(--ambient-blue-2) / 0.078) 0%, hsl(var(--ambient-blue-3) / 0.039) 46%, transparent 74%)",
      }}
      animate={{ x: [0, -70, 45, -30, 25, 0], y: [0, 55, -35, 20, -25, 0], scale: [1, 0.88, 1.18, 0.94, 1.08, 1] }}
      transition={{ duration: 27, repeat: Infinity, ease: "linear" }}
    />
    <motion.div
      className="absolute rounded-full"
      style={{
        width: "68%",
        height: "64%",
        top: "20%",
        left: "24%",
        filter: "blur(96px)",
        background:
          "radial-gradient(circle, hsl(var(--ambient-blue-1) / 0.067) 0%, hsl(var(--ambient-blue-3) / 0.033) 44%, transparent 70%)",
      }}
      animate={{ x: [0, 35, -40, 28, -22, 0], y: [0, -28, 34, -18, 22, 0], scale: [0.94, 1.08, 0.9, 1.12, 0.96, 0.94] }}
      transition={{ duration: 31, repeat: Infinity, ease: "linear" }}
    />
  </div>
);

export default AmbientBlueGlow;