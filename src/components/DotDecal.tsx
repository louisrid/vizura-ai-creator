import { useMemo } from "react";

const DotDecal = () => {
  const dots = useMemo(() => {
    const cx = 280;
    const cy = 320;
    const radius = 180;
    const spacing = 5.5;
    const result: { x: number; y: number; opacity: number }[] = [];

    for (let x = cx - radius; x <= cx + radius; x += spacing) {
      for (let y = cy - radius; y <= cy + radius; y += spacing) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist > radius) continue;
        const normalised = dist / radius;
        const opacity = 0.55 * (1 - normalised * normalised);
        if (opacity > 0.01) {
          result.push({ x, y, opacity });
        }
      }
    }
    return result;
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0 }}>
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        {dots.map((d, i) => (
          <circle
            key={i}
            cx={`${(d.x / 430) * 100}%`}
            cy={d.y}
            r={1.4}
            fill="#ffe603"
            opacity={d.opacity}
            className="md:opacity-[0.3]"
          />
        ))}
      </svg>
      {/* Black overlay on top of dots — 28% opacity */}
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.47)" }} />
    </div>
  );
};

export default DotDecal;
