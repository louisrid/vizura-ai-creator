import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { animate, motion, useMotionValue, type PanInfo } from "framer-motion";

interface CardCarouselProps {
  images: (string | null)[];
  activeIndex: number;
  onPrevious: () => void;
  onNext: () => void;
}

const CARD_COUNT = 3;
const VISIBLE_OFFSETS = [-2, -1, 0, 1, 2] as const;
const SWIPE_DISTANCE = 80;
const SWIPE_TRIGGER = 0.15;

type SlideStyle = {
  blur: number;
  opacity: number;
  rotateY: number;
  scale: number;
  x: number;
  zIndex: number;
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const interpolate = (value: number, input: number[], output: number[]) => {
  if (value <= input[0]) return output[0];
  if (value >= input[input.length - 1]) return output[output.length - 1];

  for (let i = 0; i < input.length - 1; i += 1) {
    const start = input[i];
    const end = input[i + 1];

    if (value >= start && value <= end) {
      const progress = (value - start) / (end - start);
      return output[i] + (output[i + 1] - output[i]) * progress;
    }
  }

  return output[output.length - 1];
};

const getSlideStyle = (position: number): SlideStyle => {
  const clampedPosition = clamp(position, -2, 2);
  const anchors = [-2, -1, 0, 1, 2];

  return {
    x: interpolate(clampedPosition, anchors, [-280, -150, 0, 150, 280]),
    scale: interpolate(clampedPosition, anchors, [0.54, 0.8, 1, 0.8, 0.54]),
    rotateY: interpolate(clampedPosition, anchors, [58, 34, 0, -34, -58]),
    opacity: interpolate(clampedPosition, anchors, [0, 0.48, 1, 0.48, 0]),
    blur: interpolate(clampedPosition, anchors, [4, 1.5, 0, 1.5, 4]),
    zIndex: Math.round(interpolate(Math.abs(clampedPosition), [0, 1, 2], [30, 20, 10])),
  };
};

const CardCarousel = ({ images, activeIndex, onPrevious, onNext }: CardCarouselProps) => {
  const total = images.length || CARD_COUNT;
  const progress = useMotionValue(0);
  const [visualIndex, setVisualIndex] = useState(activeIndex);
  const [progressValue, setProgressValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const unsubscribe = progress.on("change", (latest) => {
      setProgressValue(latest);
    });

    return unsubscribe;
  }, [progress]);

  useEffect(() => {
    if (!isAnimating && activeIndex !== visualIndex) {
      setVisualIndex(activeIndex);
      progress.jump(0);
      setProgressValue(0);
    }
  }, [activeIndex, isAnimating, progress, visualIndex]);

  const getIndex = useCallback(
    (offset: number) => (visualIndex + offset + total) % total,
    [total, visualIndex]
  );

  const settleTo = useCallback(
    (step: 1 | -1) => {
      setIsAnimating(true);

      animate(progress, step === 1 ? -1 : 1, {
        type: "spring",
        stiffness: 220,
        damping: 28,
        mass: 0.8,
        onComplete: () => {
          progress.jump(0);
          setProgressValue(0);
          setVisualIndex((current) => (current + step + total) % total);
          setIsAnimating(false);

          if (step === 1) onNext();
          else onPrevious();
        },
      });
    },
    [onNext, onPrevious, progress, total]
  );

  const resetPosition = useCallback(() => {
    animate(progress, 0, {
      type: "spring",
      stiffness: 320,
      damping: 30,
      mass: 0.7,
      onComplete: () => setProgressValue(0),
    });
  }, [progress]);

  const handleDrag = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (isAnimating) return;

      const nextProgress = clamp(info.offset.x / SWIPE_DISTANCE, -1, 1);
      progress.set(nextProgress);
    },
    [isAnimating, progress]
  );

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (isAnimating) return;

      const endProgress = clamp(info.offset.x / SWIPE_DISTANCE, -1, 1);
      const flick = Math.abs(info.velocity.x) > 300;
      const crossedThreshold = Math.abs(endProgress) > SWIPE_TRIGGER;

      if (crossedThreshold || flick) {
        settleTo(endProgress < 0 ? 1 : -1);
        return;
      }

      resetPosition();
    },
    [isAnimating, resetPosition, settleTo]
  );

  const goPrevious = useCallback(() => {
    if (!isAnimating) settleTo(-1);
  }, [isAnimating, settleTo]);

  const goNext = useCallback(() => {
    if (!isAnimating) settleTo(1);
  }, [isAnimating, settleTo]);

  return (
    <section className="flex flex-col items-center">
      <motion.div
        className="relative w-full touch-pan-y cursor-grab active:cursor-grabbing select-none"
        style={{ height: 320, perspective: "1400px" }}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.06}
        dragMomentum={false}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
      >
        {VISIBLE_OFFSETS.map((offset) => {
          const index = getIndex(offset);
          const slideStyle = getSlideStyle(offset + progressValue);
          const isHighlighted = Math.abs(offset + progressValue) < 0.55;

          return (
            <div
              key={`${visualIndex}-${offset}-${index}`}
              className="absolute top-1/2"
              style={{
                left: `calc(50% + ${slideStyle.x}px)`,
                width: "56%",
                opacity: slideStyle.opacity,
                zIndex: slideStyle.zIndex,
                transform: `translate(-50%, -50%) rotateY(${slideStyle.rotateY}deg) scale(${slideStyle.scale})`,
                transformStyle: "preserve-3d",
                filter: `blur(${slideStyle.blur}px)`,
                willChange: "transform, opacity, filter",
              }}
            >
              <div className="aspect-[4/5]">
                <CardContent image={images[index] ?? null} index={index + 1} isHighlighted={isHighlighted} />
              </div>
            </div>
          );
        })}
      </motion.div>

      <div className="mt-5 flex items-center gap-3">
        <button
          type="button"
          onClick={goPrevious}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-colors hover:bg-foreground/80 disabled:opacity-50"
          aria-label="previous"
          disabled={isAnimating}
        >
          <ChevronLeft size={16} strokeWidth={2.5} />
        </button>
        <button
          type="button"
          onClick={goNext}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-foreground text-background transition-colors hover:bg-foreground/80 disabled:opacity-50"
          aria-label="next"
          disabled={isAnimating}
        >
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>
    </section>
  );
};

const CardContent = ({ image, index, isHighlighted }: { image: string | null; index: number; isHighlighted: boolean }) => (
  <div
    className={`relative h-full w-full overflow-hidden rounded-2xl ${
      isHighlighted ? "border-gradient-purple shadow-glow" : "border-2 border-border/40"
    }`}
  >
    {image ? (
      <img src={image} alt={`generated character ${index}`} className="h-full w-full object-cover" draggable={false} />
    ) : (
      <div className="flex h-full w-full items-center justify-center bg-card">
        <span className={`font-extrabold text-foreground ${isHighlighted ? "text-5xl" : "text-3xl"}`}>{index}</span>
      </div>
    )}

    <div className="absolute left-3 top-3 flex h-8 min-w-8 items-center justify-center border-2 border-foreground bg-background px-2 text-sm font-extrabold text-foreground">
      {index}
    </div>
  </div>
);

export default CardCarousel;
