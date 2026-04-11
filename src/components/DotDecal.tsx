import { useMemo } from "react";

interface DotGridProps {
  cx: number;
  cy: number;
  radius: number;
  flipX?: boolean;
}

const useDotGrid = ({ cx, cy, radius, flipX }: DotGridProps) => {
  return useMemo(() => {
    const spacing = 5.5;
    const result: { x: number; y: number; opacity: number }[] = [];

    for (let x = cx - radius; x <= cx + radius; x += spacing) {
      for (let y = cy - radius; y <= cy + radius; y += spacing) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist > radius) continue;
        const normalised = dist / radius;
        const opacity = 0.55 * (1 - normalised * normalised);
        if (opacity > 0.01) {
          const finalX = flipX ? 430 - x : x;
          result.push({ x: finalX, y, opacity });
        }
      }
    }
    return result;
  }, [cx, cy, radius, flipX]);
};

const DotDecal = () => {
  const dots1 = useDotGrid({ cx: 280, cy: 320, radius: 180, flipX: false });
  const dots2 = useDotGrid({ cx: 280, cy: 320, radius: 180, flipX: true });

  // Offset the second grid so it starts where the first fades out
  const secondGridOffsetY = 360;

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0 }}>
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        {/* First dot grid — original position */}
        {dots1.map((d, i) => (
          <circle
            key={`a${i}`}
            cx={`${(d.x / 430) * 100}%`}
            cy={d.y}
            r={1.4}
            fill="#ffe603"
            opacity={d.opacity}
            className="md:opacity-[0.3]"
          />
        ))}
        {/* Second dot grid — flipped horizontally, positioned below */}
        {dots2.map((d, i) => (
          <circle
            key={`b${i}`}
            cx={`${(d.x / 430) * 100}%`}
            cy={d.y + secondGridOffsetY}
            r={1.4}
            fill="#ffe603"
            opacity={d.opacity}
            className="md:opacity-[0.3]"
          />
        ))}
      </svg>
      {/* Black overlay on top of dots — 47% opacity */}
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.45)" }} />
    </div>
  );
};

export default DotDecal;
