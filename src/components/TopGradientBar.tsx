const TopGradientBar = () => {
  return (
    <div className="pointer-events-none w-full h-[7px] overflow-hidden">
      <svg
        aria-hidden="true"
        className="block h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 7"
      >
        <defs>
          <linearGradient id="header-top-bar-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "hsl(var(--neon-yellow))", stopOpacity: 1 }} />
            <stop offset="25%" style={{ stopColor: "hsl(var(--neon-yellow))", stopOpacity: 1 }} />
            <stop offset="55%" style={{ stopColor: "hsl(var(--neon-yellow))", stopOpacity: 0.3 }} />
            <stop offset="75%" style={{ stopColor: "hsl(var(--neon-yellow))", stopOpacity: 0.05 }} />
            <stop offset="100%" style={{ stopColor: "hsl(var(--neon-yellow))", stopOpacity: 0 }} />
          </linearGradient>
        </defs>
        <rect x="0" y="0" width="100" height="7" fill="url(#header-top-bar-gradient)" />
      </svg>
    </div>
  );
};

export default TopGradientBar;
