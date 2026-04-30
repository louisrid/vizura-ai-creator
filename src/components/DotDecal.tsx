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
        const opacity = 0.075 * (1 - normalised * normalised);
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
  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0 }}>
      <svg
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="none"
      >
        {dots1.map((d, i) => (
          <circle
            key={`a${i}`}
            cx={`${(d.x / 430) * 100}%`}
            cy={d.y}
            r={1.4}
            fill="hsl(var(--neon-yellow))"
            opacity={d.opacity}
            className="md:opacity-[0.045]"
          />
        ))}
      </svg>
    </div>
  );
};

export default DotDecal;
