import { useCallback } from "react";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";

interface CardCarouselProps {
  images: (string | null)[];
  activeIndex: number;
  onPrevious: () => void;
  onNext: () => void;
}

const CardCarousel = ({ images, activeIndex, onPrevious, onNext }: CardCarouselProps) => {
  const total = images.length || 3;

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < -40) onNext();
      else if (info.offset.x > 40) onPrevious();
    },
    [onNext, onPrevious]
  );

  const getCard = (offset: number) => {
    const idx = (activeIndex + offset + total) % total;
    return images[idx] ?? null;
  };

  const cardPositions = [
    { offset: -1, style: { width: "38%", left: "2%", x: 0, scale: 0.82, zIndex: 10 }, opacity: 0.5 },
    { offset: 0, style: { width: "56%", left: "22%", x: 0, scale: 1, zIndex: 30 }, opacity: 1 },
    { offset: 1, style: { width: "38%", right: "2%", left: "60%", x: 0, scale: 0.82, zIndex: 10 }, opacity: 0.5 },
  ];

  return (
    <section className="flex flex-col items-center">
      <motion.div
        className="relative w-full cursor-grab active:cursor-grabbing"
        style={{ height: "320px" }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.15}
        onDragEnd={handleDragEnd}
      >
        {cardPositions.map(({ offset, style, opacity }) => (
          <motion.div
            key={`pos-${offset}`}
            className="absolute"
            style={{
              top: "50%",
              width: style.width,
              left: style.left,
            }}
            animate={{
              scale: style.scale,
              opacity,
              y: "-50%",
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <AnimatePresence mode="popLayout">
              <motion.div
                key={`card-${(activeIndex + offset + total) % total}`}
                className="aspect-[4/5]"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.25 }}
              >
                <CardContent image={getCard(offset)} isCenter={offset === 0} />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>

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

const CardContent = ({ image, isCenter }: { image: string | null; isCenter?: boolean }) => (
  <div
    className={`h-full w-full overflow-hidden rounded-2xl ${
      isCenter ? "border-gradient-purple relative shadow-glow" : "border-2 border-border/40"
    }`}
  >
    {image ? (
      <img src={image} alt="generated character" className="h-full w-full object-cover" />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-card">
        <div className={`flex items-center justify-center rounded-full bg-muted text-muted-foreground ${
          isCenter ? "h-16 w-16" : "h-12 w-12"
        }`}>
          <User size={isCenter ? 32 : 24} strokeWidth={2} />
        </div>
      </div>
    )}
  </div>
);

export default CardCarousel;
