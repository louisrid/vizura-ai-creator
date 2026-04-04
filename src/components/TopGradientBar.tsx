/** Top yellow accent bar — matches the animation flow's TopLine exactly */
const TopGradientBar = () => (
  <div className="pointer-events-none absolute inset-x-0 top-0 z-[2]">
    <div
      style={{
        height: 5,
        background:
          "linear-gradient(90deg, #facc15 0%, #facc15 20%, rgba(250,204,21,0.3) 50%, transparent 80%)",
      }}
    />
  </div>
);

export default TopGradientBar;
