import { useCallback, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CardCarouselProps {
  images: (string | null)[];
  activeIndex: number;
  onPrevious: () => void;
  onNext: () => void;
}

const SWIPE_THRESHOLD = 20;

const CardCarousel = ({ images, activeIndex, onPrevious, onNext }: CardCarouselProps) => {
  const [direction, setDirection] = useState(0);
  const total = images.length || 3;
  const swiping = useRef(false);

  const goPrev = useCallback(() => {
    if (swiping.current) return;
    swiping.current = true;
    setDirection(-1);
    onPrevious();
    setTimeout(() => { swiping.current = false; }, 250);
  }, [onPrevious]);

  const goNext = useCallback(() => {
    if (swiping.current) return;
    swiping.current = true;
    setDirection(1);
    onNext();
    setTimeout(() => { swiping.current = false; }, 250);
  }, [onNext]);

  const handleDragEnd = useCallback(
    (_: never, info: { offset: { x: number }; velocity: { x: number } }) => {
      const { offset, velocity } = info;
      if (Math.abs(offset.x) > SWIPE_THRESHOLD || Math.abs(velocity.x) > 120) {
        if (offset.x < 0) goNext();
        else goPrev();
      }
    },
    [goNext, goPrev]
  );

  const current = images[activeIndex] ?? null;

  return (
    <section className="flex flex-col items-center">
      {/* Swipeable area — intentionally taller than the card for easy finger reach */}
      <motion.div
        className="relative w-full cursor-grab active:cursor-grabbing select-none"
        style={{ height: 300, touchAction: "pan-y pinch-zoom" }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.08}
        dragMomentum={false}
        onDragEnd={handleDragEnd as any}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={activeIndex}
              custom={direction}
              initial={{ x: direction > 0 ? 160 : -160, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: direction > 0 ? -160 : 160, opacity: 0 }}
              transition={{ duration: 0.18, ease: [0.25, 0.1, 0.25, 1] }}
              className="mx-auto"
              style={{ width: "70%", aspectRatio: "1 / 1" }}
            >
              <CardContent image={current} index={activeIndex + 1} />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Nav + counter */}
      <div className="flex items-center gap-5 mt-6">
        <button
          type="button"
          onClick={goPrev}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background transition-colors hover:bg-foreground/90"
          aria-label="previous"
        >
          <ChevronLeft size={20} strokeWidth={2.5} />
        </button>

        <span className="text-base font-extrabold text-foreground lowercase">
          {activeIndex + 1} / {total}
        </span>

        <button
          type="button"
          onClick={goNext}
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-foreground text-background transition-colors hover:bg-foreground/90"
          aria-label="next"
        >
          <ChevronRight size={20} strokeWidth={2.5} />
        </button>
      </div>
    </section>
  );
};

const angleLabels = ["front", "left 3/4", "right 3/4"];

const CardContent = ({ image, index }: { image: string | null; index: number }) => (
  <div className="relative h-full w-full overflow-hidden rounded-3xl shadow-[0_4px_20px_rgba(0,0,0,0.10)] flex flex-col">
    {/* Polaroid header strip */}
    <div className="bg-neon-yellow px-4 py-2.5 flex items-center justify-between">
      <span className="text-[11px] font-extrabold uppercase tracking-wide text-white">
        photo {index}
      </span>
      <span className="text-[10px] font-extrabold lowercase tracking-tight text-white/80">
        {angleLabels[index - 1] || `view ${index}`}
      </span>
    </div>
    {/* Image area */}
    <div className="flex-1 min-h-0 bg-card">
      {image ? (
        <img src={image} alt={`generated character ${index}`} className="h-full w-full object-cover" draggable={false} />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          <span className="text-4xl font-extrabold text-foreground/20">{index}</span>
        </div>
      )}
    </div>
  </div>
);

export default CardCarousel;
