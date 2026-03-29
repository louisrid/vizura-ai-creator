import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

/**
 * Generates geometric shard data for the shatter effect.
 * Shards fly outward from centre in all directions.
 */
const generateShards = (color: string, count = 12) => {
  const shards: {
    id: number;
    x: number;
    y: number;
    w: number;
    h: number;
    rotate: number;
    tx: number;
    ty: number;
    tr: number;
    delay: number;
    color: string;
  }[] = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 360 + (Math.random() - 0.5) * 30;
    const rad = (angle * Math.PI) / 180;
    const distance = 120 + Math.random() * 80; // vw units
    shards.push({
      id: i,
      // Start position: spread around centre
      x: 50 + (Math.random() - 0.5) * 40,
      y: 50 + (Math.random() - 0.5) * 40,
      w: 15 + Math.random() * 25,
      h: 15 + Math.random() * 25,
      rotate: Math.random() * 40 - 20,
      // Fly-out target
      tx: Math.cos(rad) * distance,
      ty: Math.sin(rad) * distance,
      tr: (Math.random() - 0.5) * 180,
      delay: Math.random() * 0.06,
      color,
    });
  }
  return shards;
};

interface ShatterExitProps {
  active: boolean;
  color: string; // e.g. "hsl(0 0% 0%)" or "hsl(140 100% 50%)"
  onComplete: () => void;
  duration?: number;
}

const ShatterExit = ({ active, color, onComplete, duration = 450 }: ShatterExitProps) => {
  const [shards, setShards] = useState<ReturnType<typeof generateShards>>([]);
  const [phase, setPhase] = useState<"idle" | "solid" | "shatter" | "done">("idle");

  const start = useCallback(() => {
    const newShards = generateShards(color, 14);
    setShards(newShards);
    setPhase("solid");
    // Brief solid frame then shatter
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setPhase("shatter");
      });
    });
  }, [color]);

  useEffect(() => {
    if (active) start();
  }, [active, start]);

  useEffect(() => {
    if (phase !== "shatter") return;
    const t = setTimeout(() => {
      setPhase("done");
      onComplete();
    }, duration + 50);
    return () => clearTimeout(t);
  }, [phase, duration, onComplete]);

  if (phase === "idle" || phase === "done") return null;

  const durationS = duration / 1000;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] pointer-events-none overflow-hidden"
      style={{ perspective: "800px" }}
    >
      {shards.map((s) => (
        <motion.div
          key={s.id}
          className="absolute"
          style={{
            left: `${s.x}%`,
            top: `${s.y}%`,
            width: `${s.w}vw`,
            height: `${s.h}vh`,
            backgroundColor: s.color,
            transformOrigin: "center center",
            rotate: s.rotate,
          }}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
          animate={
            phase === "shatter"
              ? {
                  x: `${s.tx}vw`,
                  y: `${s.ty}vh`,
                  rotate: s.rotate + s.tr,
                  scale: 0.3,
                  opacity: 0,
                }
              : {}
          }
          transition={{
            duration: durationS,
            delay: s.delay,
            ease: [0.23, 1, 0.32, 1],
          }}
        />
      ))}
    </div>,
    document.body,
  );
};

export default ShatterExit;
