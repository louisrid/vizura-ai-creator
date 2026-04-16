import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import foxEmojiImg from "@/assets/fox-emoji.png";

/* ── Types ── */
export interface SlideConfig {
  emoji: string;
  title: string;
  pills: { text: string; side: "left" | "right"; highlight?: boolean }[];
  hideDashes?: boolean;
}

export interface InstructionalSlideProps {
  slide: SlideConfig;
  /** If true, show pills statically with no entrance animation */
  alreadySeen?: boolean;
  /** Total dashes to render */
  dashTotal: number;
  /** Which dash is active (0-indexed) */
  dashActive: number;
  /** Show back arrow? */
  showBack?: boolean;
  /** Show forward arrow? */
  showForward?: boolean;
  onBack?: () => void;
  onForward?: () => void;
}

const Y = "#ffe603";
const DASH_INACTIVE = "rgba(250,204,21,0.30)";

/* ── Chat bubble pill ── */
const ChatPill = ({
  text,
  side,
  delay,
  animate,
  highlight,
}: {
  text: string;
  side: "left" | "right";
  delay: number;
  animate: boolean;
  highlight?: boolean;
}) => {
  const isLeft = side === "left";
  const bgColor = highlight ? "hsl(var(--neon-green))" : "hsl(var(--foreground))";
  return (
    <motion.div
      className={`flex ${isLeft ? "justify-start" : "justify-end"}`}
      initial={animate ? { x: isLeft ? "-120%" : "120%" } : false}
      animate={{ x: 0 }}
      transition={
        animate
          ? { duration: 0.25, delay, ease: [0.25, 0.8, 0.25, 1] }
          : undefined
      }
    >
      <div className="relative">
        <div
          className="px-5 py-3 text-[15px] md:text-[17px] font-[900] lowercase leading-snug"
          style={{
            borderRadius: 10,
            backgroundColor: bgColor,
            color: highlight ? "#fff" : "#000",
            border: "none",
          }}
        >
          {text}
        </div>
        {/* Message bubble triangle */}
        <div
          style={{
            position: "absolute",
            bottom: -7,
            ...(isLeft ? { left: 12 } : { right: 12 }),
            width: 0,
            height: 0,
            borderLeft: isLeft ? "none" : "8px solid transparent",
            borderRight: isLeft ? "8px solid transparent" : "none",
            borderTop: `8px solid ${bgColor}`,
          }}
        />
      </div>
    </motion.div>
  );
};

/* ── Nav arrow (same as GuidedCreator) ── */
const NavArrow = ({
  direction,
  onClick,
}: {
  direction: "left" | "right";
  onClick: () => void;
}) => {
  const isForward = direction === "right";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      className="flex items-center justify-center active:opacity-70 transition-opacity duration-150 w-[62px] h-[62px] md:w-[78px] md:h-[78px]"
      style={{
        borderRadius: 10,
        backgroundColor: isForward ? Y : "#000000",
        border: isForward ? "none" : `2px solid ${Y}`,
        outline: "none",
        padding: 0,
        cursor: "pointer",
        color: isForward ? "#000" : Y,
      }}
    >
      {direction === "left" ? (
        <svg width="22" height="18" viewBox="0 0 20 16" fill="none" className="md:w-[28px] md:h-[22px]">
          <path d="M8 1L1.5 8L8 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="2" y1="8" x2="18.5" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ) : (
        <svg width="22" height="18" viewBox="0 0 20 16" fill="none" className="md:w-[28px] md:h-[22px]">
          <path d="M12 1L18.5 8L12 15" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <line x1="1.5" y1="8" x2="18" y2="8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
};

/* ── Main component ── */
const InstructionalSlide = ({
  slide,
  alreadySeen = false,
  dashTotal,
  dashActive,
  showBack = true,
  showForward = true,
  onBack,
  onForward,
}: InstructionalSlideProps) => {
  const [hasAnimated, setHasAnimated] = useState(alreadySeen);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (alreadySeen) {
      setHasAnimated(true);
      return;
    }
    const totalDelay = slide.pills.length * 0.5 + 0.5 + 0.25;
    timerRef.current = setTimeout(() => setHasAnimated(true), totalDelay * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [alreadySeen, slide.pills.length]);

  /* Hide TopGradientBar while this slide is mounted */
  useEffect(() => {
    document.documentElement.dataset.guidedCreatorOpen = "1";
    return () => { delete document.documentElement.dataset.guidedCreatorOpen; };
  }, []);

  const shouldAnimate = !alreadySeen && !hasAnimated;
  const isSinglePill = slide.pills.length === 1;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex flex-col"
      style={{ background: "#000", overflow: "hidden", touchAction: "none" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeInOut" }}
    >
      {/* Dashes at top */}
      {!slide.hideDashes && dashTotal > 0 && (
        <div className="absolute inset-x-0 flex flex-col items-center px-4" style={{ top: 0, paddingTop: "max(env(safe-area-inset-top), 36px)" }}>
          <div className="flex items-center justify-center gap-[3px] md:gap-[5px] w-full max-w-[280px] md:max-w-sm mx-auto">
            {Array.from({ length: dashTotal }).map((_, i) => (
              <div
                key={i}
                className="transition-all duration-300 h-[4px] md:h-[6px]"
                style={{
                  flex: 1,
                  borderRadius: 2,
                  background: i <= dashActive ? Y : DASH_INACTIVE,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Content area */}
      <div
        className="absolute inset-x-0 flex items-center justify-center px-6 md:px-12"
        style={{ top: 72, bottom: 160 }}
      >
        <div className="w-full max-w-sm md:max-w-lg mx-auto flex flex-col items-center">
          {/* Emoji */}
          {slide.emoji === "🦊" ? (
            <motion.img
              src={foxEmojiImg}
              alt="🦊"
              className="mb-5 md:mb-7 inline-block"
              style={{ width: 64, height: 64, objectFit: 'contain' }}
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            />
          ) : (
            <motion.span
              className="text-[64px] md:text-[86px] mb-5 md:mb-7 inline-block"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              {slide.emoji}
            </motion.span>
          )}

          {/* Title */}
          <h2 className="text-center text-[36px] md:text-[52px] font-[900] lowercase leading-[1.05] tracking-tight text-white">
            {slide.title}
          </h2>

          {/* Chat bubble pills */}
          <div className="mt-6 md:mt-8 w-full max-w-[90vw] md:max-w-[32rem] flex flex-col gap-4" style={{ overflowX: "hidden", overflowY: "visible", paddingBottom: 10 }}>
            {slide.pills.map((pill, i) => (
              <ChatPill
                key={i}
                text={pill.text}
                side={isSinglePill ? "left" : pill.side}
                delay={shouldAnimate ? i * 0.5 + 0.5 : 0}
                animate={shouldAnimate}
                highlight={pill.highlight}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Arrows at bottom */}
      <div
        className="absolute inset-x-0 flex flex-col items-center"
        style={{ bottom: "max(env(safe-area-inset-bottom, 0px), 6%)" }}
      >
        <div className="flex items-center justify-center gap-4 md:gap-6">
          {showBack && onBack && (
            <NavArrow direction="left" onClick={onBack} />
          )}
          {showForward && onForward && (
            <NavArrow direction="right" onClick={onForward} />
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default InstructionalSlide;
