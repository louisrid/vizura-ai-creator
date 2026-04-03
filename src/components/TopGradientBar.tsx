/** 5px yellow gradient bar at top of every page */
const TopGradientBar = () => (
  <div
    className="pointer-events-none absolute top-0 left-0 right-0"
    style={{
      height: 5,
      zIndex: 2,
      background: "linear-gradient(90deg, #facc15 0%, #facc15 15%, rgba(250,204,21,0.6) 35%, rgba(250,204,21,0.2) 55%, rgba(250,204,21,0.04) 75%, transparent 95%)",
    }}
  />
);

export default TopGradientBar;
