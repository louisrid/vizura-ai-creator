/**
 * Pure-CSS ambient blue glow — no JS animation frames.
 * Uses a single CSS keyframe for gentle positional drift.
 */
const AmbientBlueGlow = () => (
  <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
    <div
      className="absolute rounded-full animate-ambient-drift-1"
      style={{
        width: "100%",
        height: "92%",
        top: "-10%",
        left: "-10%",
        filter: "blur(118px)",
        background:
          "radial-gradient(circle, hsl(222 86% 54% / 0.12) 0%, hsl(215 84% 44% / 0.06) 42%, transparent 72%)",
      }}
    />
    <div
      className="absolute rounded-full animate-ambient-drift-2"
      style={{
        width: "82%",
        height: "78%",
        right: "-12%",
        bottom: "-12%",
        filter: "blur(104px)",
        background:
          "radial-gradient(circle, hsl(215 84% 44% / 0.09) 0%, hsl(231 74% 38% / 0.045) 46%, transparent 74%)",
      }}
    />
  </div>
);

export default AmbientBlueGlow;
