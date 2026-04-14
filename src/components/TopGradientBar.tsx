import { createPortal } from "react-dom";

/** Top yellow accent bar — flush at very top, perfectly straight with horizontal opacity fade. */
const TopGradientBar = () => {
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="pointer-events-none fixed top-0 left-0 right-0 h-[5px] overflow-hidden"
      style={{ zIndex: 2147483646 }}
    >
      <svg
        aria-hidden="true"
        className="block h-full w-full"
        preserveAspectRatio="none"
        viewBox="0 0 100 5"
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
        <rect x="0" y="0" width="100" height="5" fill="url(#header-top-bar-gradient)" />
      </svg>
    </div>,
    document.body,
  );
};

export default TopGradientBar;
