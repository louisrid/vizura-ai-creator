interface EmojiPreviewBoxProps {
  emoji: string;
  className?: string;
  emojiClassName?: string;
}

const EmojiPreviewBox = ({ emoji, className = "", emojiClassName = "" }: EmojiPreviewBoxProps) => {
  return (
    <div
      className={`flex aspect-square items-center justify-center rounded-[10px] border-2 border-[hsl(var(--card))] ${className}`.trim()}
      style={{ backgroundColor: "hsl(var(--card))" }}
    >
      <span className={`select-none leading-none ${emojiClassName}`.trim()} aria-hidden="true">
        {emoji}
      </span>
    </div>
  );
};

export default EmojiPreviewBox;