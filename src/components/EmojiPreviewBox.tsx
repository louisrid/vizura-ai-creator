interface EmojiPreviewBoxProps {
  emoji: string;
  className?: string;
  emojiClassName?: string;
}

const EmojiPreviewBox = ({ emoji, className = "", emojiClassName = "" }: EmojiPreviewBoxProps) => {
  return (
    <div
      className={`flex aspect-square items-center justify-center rounded-2xl border-2 border-[#1e1e1e] ${className}`.trim()}
      style={{ backgroundColor: "#1e1e1e" }}
    >
      <span className={`select-none leading-none ${emojiClassName}`.trim()} aria-hidden="true">
        {emoji}
      </span>
    </div>
  );
};

export default EmojiPreviewBox;