import { useMemo } from "react";

const HexMesh1 = () => {
  const hexagons = useMemo(() => {
    const hexSize = 40;
    const hexWidth = hexSize * Math.sqrt(3);
    const hexHeight = hexSize * 2;
    const vertSpacing = hexHeight * 0.75;
    const result: { cx: number; cy: number; wavePhase: number }[] = [];

    const startX = 170;
    const endX = 460;
    const startY = -40;
    const endY = 740;

    let row = 0;
    for (let y = startY; y <= endY; y += vertSpacing) {
      const xOffset = row % 2 === 0 ? 0 : hexWidth / 2;
      let col = 0;
      for (let x = startX; x <= endX + hexWidth; x += hexWidth) {
        const cx = x + xOffset;
        const cy = y;
        if (cx < startX - hexWidth) continue;

        const distFromRight = (endX - cx) / (endX - startX);
        if (distFromRight > 1.1) continue;

        const seed = (row * 11 + col * 19) % 31;
        if (seed % 5 === 0) { col++; continue; }

        const wavePhase = distFromRight * 2.5;
        result.push({ cx, cy, wavePhase });
        col++;
      }
      row++;
    }
    return result;
  }, []);

  const hexPath = (cx: number, cy: number, size: number) => {
    const points: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i + Math.PI / 6;
      const x = cx + size * Math.cos(angle);
      const y = cy + size * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return points.join(" ");
  };

  return (
    <div className="pointer-events-none absolute inset-0" style={{ zIndex: 0 }}>
      <style>{`
        @keyframes hex-m1 {
          0% { opacity: 0.05; }
          50% { opacity: 0.3; }
          100% { opacity: 0.05; }
        }
      `}</style>
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 430 700"
        preserveAspectRatio="xMidYMid slice"
      >
        {hexagons.map((h, i) => (
          <polygon
            key={i}
            points={hexPath(h.cx, h.cy, 38)}
            fill="none"
            stroke="#ffe603"
            strokeWidth={1}
            style={{
              animation: `hex-m1 4s ease-in-out infinite`,
              animationDelay: `${h.wavePhase}s`,
            }}
          />
        ))}
      </svg>
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.45)" }} />
    </div>
  );
};

export default HexMesh1;
