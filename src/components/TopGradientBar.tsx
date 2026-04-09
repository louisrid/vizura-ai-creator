/** Top yellow accent bar — flush at very top, full-width rectangle with opacity fade.
 *  Uses a solid yellow background with a masking overlay to fade, ensuring the bar
 *  stays a crisp rectangle and never appears to taper or get thinner. */
const TopGradientBar = () => (
  <div
    className="pointer-events-none fixed inset-x-0 top-0 z-[9998]"
    style={{ height: 5 }}
  >
    {/* Solid yellow base — full width, full height */}
    <div
      className="absolute inset-0"
      style={{ backgroundColor: "#facc15" }}
    />
    {/* Black overlay that fades in from right to create opacity effect */}
    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, transparent 25%, rgba(0,0,0,0.7) 55%, rgba(0,0,0,0.95) 75%, rgba(0,0,0,1) 100%)",
      }}
    />
  </div>
);

export default TopGradientBar;
