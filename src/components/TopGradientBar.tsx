/** Top yellow accent bar — flush at very top, matches animation flow TopLine */
const TopGradientBar = () => (
  <div
    className="pointer-events-none fixed inset-x-0 top-0 z-[9998]"
    style={{ height: 5 }}
  >
    <div
      className="h-full w-full"
      style={{
        background:
          "linear-gradient(90deg, #facc15 0%, #facc15 25%, rgba(250,204,21,0.3) 55%, transparent 75%)",
      }}
    />
  </div>
);

export default TopGradientBar;
