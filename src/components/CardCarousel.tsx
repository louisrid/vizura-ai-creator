import { useCallback } from "react";
import { ChevronLeft, ChevronRight, User } from "lucide-react";
import { type PanInfo } from "framer-motion";

interface CardCarouselProps {
  images: (string | null)[];
  activeIndex: number;
  onPrevious: () => void;
  onNext: () => void;
}

const CardCarousel = ({ images, activeIndex, onPrevious, onNext }: CardCarouselProps) => {
  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.x < -50) onNext();
      else if (info.offset.x > 50) onPrevious();
    },
    [onNext, onPrevious]
  );

  const total = images.length || 3;

  const getCard = (offset: number) => {
    const idx = (activeIndex + offset + total) % total;
    return images[idx] ?? null;
  };

  return (
    <section className="flex flex-col items-center">
      <div className="relative flex items-center justify-center w-full" style={{ height: "320px" }}>
        {/* Left card */}
        <div
          className="absolute z-10 transition-all duration-300 ease-out"
          style={{ width: "38%", left: "2%", top: "50%", transform: "translateY(-50%) scale(0.82)" }}
        >
          <div className="aspect-[4/5] opacity-50">
            <CardContent image={getCard(-1)} />
          </div>
        </div>

        {/* Center card */}
        <div
          className="relative z-30 cursor-grab active:cursor-grabbing transition-all duration-300 ease-out"
          style={{ width: "56%" }}
        >
          <div className="aspect-[4/5]">
            <CardContent image={getCard(0)} isCenter />
          </div>
        </div>

        {/* Right card */}
        <div
          className="absolute z-10 transition-all duration-300 ease-out"
          style={{ width: "38%", right: "2%", top: "50%", transform: "translateY(-50%) scale(0.82)" }}
        >
          <div className="aspect-[4/5] opacity-50">
            <CardContent image={getCard(1)} />
          </div>
        </div>
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
