import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { motion, AnimatePresence, type PanInfo } from "framer-motion";

interface CardCarouselProps {
  images: (string | null)[];
  activeIndex: number;
  onPrevious: () => void;
  onNext: () => void;
}

const CardCarousel = ({ images, activeIndex, onPrevious, onNext }: CardCarouselProps) => {
  const [direction, setDirection] = useState(0);

  const handlePrevious = useCallback(() => {
    setDirection(-1);
    onPrevious();
  }, [onPrevious]);

  const handleNext = useCallback(() => {
    setDirection(1);
    onNext();
  }, [onNext]);

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < -50) handleNext();
      else if (info.offset.x > 50) handlePrevious();
    },
    [handleNext, handlePrevious]
  );

  const total = images.length || 3;
  const prevIndex = (activeIndex - 1 + total) % total;
  const nextIndex = (activeIndex + 1) % total;

  const centerImage = images[activeIndex] ?? null;
  const leftImage = images[prevIndex] ?? null;
  const rightImage = images[nextIndex] ?? null;

  return (
    <section className="flex flex-col items-center">
      {/* Carousel with perspective */}
      <div
        className="relative flex items-center justify-center w-full"
        style={{ perspective: "800px", height: "320px" }}
      >
        {/* Left card */}
        <div
          className="absolute z-10"
          style={{
            width: "42%",
            left: "-4%",
            top: "50%",
            transform: "translateY(-50%) rotateY(30deg) scale(0.78)",
            transformOrigin: "right center",
          }}
        >
          <div className="aspect-[4/5]">
            <CardContent image={leftImage} />
          </div>
        </div>

        {/* Center card */}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`center-${activeIndex}`}
            initial={{
              x: direction > 0 ? 100 : -100,
              scale: 0.8,
              opacity: 0.5,
            }}
            animate={{
              x: 0,
              scale: 1,
              opacity: 1,
            }}
            exit={{
              x: direction > 0 ? -100 : 100,
              scale: 0.8,
              opacity: 0.5,
            }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative z-30 cursor-grab active:cursor-grabbing"
            style={{ width: "58%" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.3}
            onDragEnd={handleDragEnd}
          >
            <div className="aspect-[4/5]">
              <CardContent image={centerImage} isCenter />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Right card */}
        <div
          className="absolute z-10"
          style={{
            width: "42%",
            right: "-4%",
            top: "50%",
            transform: "translateY(-50%) rotateY(-30deg) scale(0.78)",
            transformOrigin: "left center",
          }}
        >
          <div className="aspect-[4/5]">
            <CardContent image={rightImage} />
          </div>
        </div>
      </div>

      {/* Arrow buttons */}
      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={handlePrevious}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-colors hover:bg-foreground/80"
          aria-label="previous"
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={handleNext}
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
    className={`h-full w-full overflow-hidden rounded-2xl border-2 bg-card ${
      isCenter ? "border-border shadow-lg" : "border-border/60"
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
