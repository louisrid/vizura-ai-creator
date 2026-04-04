/** Smooth yellow top accent with soft fade and no clipped edge */
const TopGradientBar = () => (
  <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] overflow-hidden">
    <div
      style={{
        height: 4,
        background:
          "linear-gradient(90deg, hsl(var(--neon-yellow)) 0%, hsl(var(--neon-yellow)) 14%, hsl(var(--neon-yellow) / 0.82) 30%, hsl(var(--neon-yellow) / 0.46) 50%, hsl(var(--neon-yellow) / 0.18) 70%, hsl(var(--neon-yellow) / 0.07) 86%, transparent 100%)",
      }}
    />
    <div
      style={{
        height: 18,
        background:
          "linear-gradient(180deg, hsl(var(--neon-yellow) / 0.18) 0%, hsl(var(--neon-yellow) / 0.08) 38%, hsl(var(--neon-yellow) / 0.03) 68%, transparent 100%)",
      }}
    />
  </div>
);

export default TopGradientBar;
