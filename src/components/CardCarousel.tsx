import { useCallback, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, type PanInfo, useMotionValue, useTransform } from "framer-motion";

interface CardCarouselProps {
  images: (string | null)[];
  activeIndex: number;
  onPrevious: () => void;
  onNext: () => void;
}

const CardCarousel = ({ images, activeIndex, onPrevious, onNext }: CardCarouselProps) => {
  const total = images.length || 3;
  const dragX = useMotionValue(0);
  const [dragging, setDragging] = useState(false);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      setDragging(false);
      if (info.offset.x < -40) onNext();
      else if (info.offset.x > 40) onPrevious();
    },
    [onNext, onPrevious]
  );

  const getIdx = (offset: number) => (activeIndex + offset + total) % total;

  // Positions: left, center, right
  const cards = [-1, 0, 1];

  return (
    <section className="flex flex-col items-center">
      <div
        className="relative w-full overflow-hidden"
        style={{ height: 320 }}
      >
        <motion.div
          className="absolute inset-0 cursor-grab active:cursor-grabbing"
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.3}
          onDragStart={() => setDragging(true)}
          onDragEnd={handleDragEnd}
          style={{ x: dragX }}
        />

        {cards.map((offset) => {
          const idx = getIdx(offset);
          const isCenter = offset === 0;

          // Layout values
          const width = isCenter ? 56 : 38;
          const scale = isCenter ? 1 : 0.82;
          const opacity = isCenter ? 1 : 0.5;
          const left = offset === -1 ? 2 : offset === 0 ? 22 : 60;
          const zIndex = isCenter ? 30 : 10;

          return (
            <motion.div
              key={`slot-${offset}`}
              className="absolute"
              style={{
                top: "50%",
                width: `${width}%`,
                zIndex,
              }}
              animate={{
                left: `${left}%`,
                scale,
                opacity,
                y: "-50%",
              }}
              transition={{ type: "spring", stiffness: 350, damping: 30 }}
            >
              <div className="aspect-[4/5]">
                <CardContent index={idx + 1} image={images[idx] ?? null} isCenter={isCenter} />
              </div>
            </motion.div>
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
