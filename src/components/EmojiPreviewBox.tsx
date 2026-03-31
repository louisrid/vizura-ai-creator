interface EmojiPreviewBoxProps {
  emoji: string;
  className?: string;
  emojiClassName?: string;
}

const EmojiPreviewBox = ({ emoji, className = "", emojiClassName = "" }: EmojiPreviewBoxProps) => {
  return (
    <div
      className={`flex aspect-square items-center justify-center rounded-2xl border-[5px] border-border bg-card ${className}`.trim()}
    >
      <span className={`select-none leading-none ${emojiClassName}`.trim()} aria-hidden="true">
        {emoji}
      </span>
    </div>
  );
};

export default EmojiPreviewBox;