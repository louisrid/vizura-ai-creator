/** Top yellow accent bar — flush at very top, full width with opacity fade */
const TopGradientBar = () => (
  <div
    className="pointer-events-none fixed inset-x-0 top-0 z-[9998]"
    style={{
      height: 5,
      background:
        "linear-gradient(90deg, rgba(250,204,21,1) 0%, rgba(250,204,21,1) 25%, rgba(250,204,21,0.3) 55%, rgba(250,204,21,0.05) 75%, rgba(250,204,21,0) 100%)",
    }}
  />
);

export default TopGradientBar;
