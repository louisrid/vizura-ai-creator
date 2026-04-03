import { useMemo } from "react";

/**
 * Circular cloud of yellow dots as a background decal.
 * Center: right side ~45% down. Radius ~180px. Quadratic opacity falloff.
 */
const DotDecal = () => {
  const dots = useMemo(() => {
    const cx = 280; // center x (offset right)
    const cy = 320; // center y (~45% down)
    const radius = 180;
    const spacing = 9;
    const result: { x: number; y: number; opacity: number }[] = [];

    for (let x = cx - radius; x <= cx + radius; x += spacing) {
      for (let y = cy - radius; y <= cy + radius; y += spacing) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist > radius) continue;
        const normalised = dist / radius;
        const opacity = 0.18 * (1 - normalised * normalised);
        if (opacity > 0.01) {
          result.push({ x, y, opacity });
        }
      }
    }
    return result;
  }, []);

  return (
    <svg
      className="pointer-events-none absolute inset-0 w-full h-full"
      style={{ zIndex: 0 }}
      preserveAspectRatio="none"
    >
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={`${(d.x / 430) * 100}%`}
          cy={d.y}
          r={2}
          fill="#facc15"
          opacity={d.opacity}
        />
      ))}
    </svg>
  );
};

export default DotDecal;
