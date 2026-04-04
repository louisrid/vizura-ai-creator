/** Yellow gradient bar at top of every page with soft fade */
const TopGradientBar = () => (
  <div
    className="pointer-events-none absolute top-0 left-0 right-0"
    style={{
      height: 6,
      zIndex: 2,
      background: "linear-gradient(90deg, #facc15 0%, #facc15 15%, rgba(250,204,21,0.6) 35%, rgba(250,204,21,0.2) 55%, rgba(250,204,21,0.04) 75%, transparent 95%)",
      boxShadow: "0 0 12px 2px rgba(250,204,21,0.15), 0 2px 8px 0 rgba(250,204,21,0.08)",
    }}
  />
);

export default TopGradientBar;
