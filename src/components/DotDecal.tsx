import { useMemo } from "react";

/**
 * Circular cloud of yellow dots as a background decal.
 * Center: right side ~45% down. Radius ~180px. Quadratic opacity falloff.
 * Finer dots (1.5px), tighter spacing (7px), slightly more visible (0.22 max).
 */
const DotDecal = () => {
  const dots = useMemo(() => {
    const cx = 280;
    const cy = 320;
    const radius = 180;
    const spacing = 7;
    const result: { x: number; y: number; opacity: number }[] = [];

    for (let x = cx - radius; x <= cx + radius; x += spacing) {
      for (let y = cy - radius; y <= cy + radius; y += spacing) {
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
        if (dist > radius) continue;
        const normalised = dist / radius;
        const opacity = 0.22 * (1 - normalised * normalised);
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
          r={1.5}
          fill="#facc15"
          opacity={d.opacity}
        />
      ))}
    </svg>
  );
};

export default DotDecal;
