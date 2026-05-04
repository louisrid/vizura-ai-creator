import { useMemo } from "react";

interface DotGridProps {
  cx: number;
  cy: number;
  radius: number;
}

const useDotGrid = ({ cx, cy, radius }: DotGridProps) => {
  return useMemo(() => {
    const spacing = 5.5;
    const result: { x: number; y: number; opacity: number }[] = [];
    for (let x = cx - radius; x <= cx + radius; x += spacing) {
      for (let y = cy - radius; y <= cy + radius; y += spacing) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist > radius) continue;
        const normalised = dist / radius;
        const opacity = 0.13 * (1 - normalised * normalised);
        if (opacity > 0.01) {
          result.push({ x, y, opacity });
        }
      }
    }
    return result;
  }, [cx, cy, radius]);
};

const DotDecal = () => {
  // Single dot grid centred in a 600x800 viewBox.
  // SVG uses preserveAspectRatio="xMidYMid slice" so the grid is centred and scales to cover the container.
  const dots = useDotGrid({ cx: 300, cy: 400, radius: 320 });

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0 }}>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 600 800"
        preserveAspectRatio="xMidYMid slice"
      >
        {dots.map((d, i) => (
          <circle
            key={`a${i}`}
            cx={d.x}
            cy={d.y}
            r={1.4}
            fill="#ffe603"
            opacity={d.opacity}
            className="md:opacity-[0.3]"
          />
        ))}
      </svg>
    </div>
  );
};

export default DotDecal;
