import { useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";

interface CardCarouselProps {
  images: (string | null)[];
  activeIndex: number;
  onPrevious: () => void;
  onNext: () => void;
}

const CARD_COUNT = 3;
const DRAG_THRESHOLD = 50;

const CardCarousel = ({ images, activeIndex, onPrevious, onNext }: CardCarouselProps) => {
  const total = images.length || CARD_COUNT;
  const dragX = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize drag into -1…1 range for blending
  const dragProgress = useTransform(dragX, [-200, 0, 200], [-1, 0, 1]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < -DRAG_THRESHOLD) {
        onNext();
      } else if (info.offset.x > DRAG_THRESHOLD) {
        onPrevious();
      }
      animate(dragX, 0, { type: "spring", stiffness: 400, damping: 30 });
    },
    [onNext, onPrevious, dragX]
  );

  const getIdx = (offset: number) => (activeIndex + offset + total) % total;

  return (
    <section className="flex flex-col items-center">
      {/* 3D perspective container */}
      <div
        ref={containerRef}
        className="relative w-full"
        style={{ height: 320, perspective: 800 }}
      >
        {/* Invisible drag layer */}
        <motion.div
          className="absolute inset-0 z-40 cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.4}
          onDragEnd={handleDragEnd}
          style={{ x: dragX }}
        />

        {/* Cards */}
        {([-1, 0, 1] as const).map((offset) => {
          const idx = getIdx(offset);
          const isCenter = offset === 0;

          return (
            <Card3D
              key={`slot-${offset}`}
              offset={offset}
              dragProgress={dragProgress}
              isCenter={isCenter}
            >
              <CardContent
                index={idx + 1}
                image={images[idx] ?? null}
                isCenter={isCenter}
              />
            </Card3D>
          );
        })}
      </div>

      {/* Arrow buttons */}
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={onPrevious}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-colors hover:bg-foreground/80"
          aria-label="previous"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={onNext}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-colors hover:bg-foreground/80"
          aria-label="next"
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </section>
  );
};

/* ── 3D positioned card wrapper ── */

interface Card3DProps {
  offset: -1 | 0 | 1;
  dragProgress: ReturnType<typeof useTransform>;
  isCenter: boolean;
  children: React.ReactNode;
}

const Card3D = ({ offset, isCenter, children }: Card3DProps) => {
  // Position configs per slot
  const configs: Record<number, { x: string; z: number; rotateY: number; scale: number; opacity: number }> = {
    [-1]: { x: "-30%", z: -120, rotateY: 35, scale: 0.78, opacity: 0.55 },
    [0]:  { x: "0%",   z: 0,    rotateY: 0,  scale: 1,    opacity: 1 },
    [1]:  { x: "30%",  z: -120, rotateY: -35, scale: 0.78, opacity: 0.55 },
  };

  const cfg = configs[offset];

  return (
    <motion.div
      className="absolute left-1/2 top-1/2"
      style={{
        width: "55%",
        transformStyle: "preserve-3d",
        zIndex: isCenter ? 30 : 10,
      }}
      animate={{
        x: cfg.x,
        translateX: "-50%",
        translateY: "-50%",
        translateZ: cfg.z,
        rotateY: cfg.rotateY,
        scale: cfg.scale,
        opacity: cfg.opacity,
      }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 28,
      }}
    >
      <div className="aspect-[4/5]">{children}</div>
    </motion.div>
  );
};

/* ── Card content ── */

const CardContent = ({ index, image, isCenter }: { index: number; image: string | null; isCenter?: boolean }) => (
  <div
    className={`h-full w-full overflow-hidden rounded-2xl ${
      isCenter ? "border-gradient-purple relative shadow-glow" : "border-2 border-border/40"
    }`}
  >
    {image ? (
      <img src={image} alt="generated character" className="h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-card">
        <span className={`font-extrabold text-muted-foreground ${isCenter ? "text-4xl" : "text-2xl"}`}>
          {index}
        </span>
      </div>
    )}
  </div>
);

export default CardCarousel;
