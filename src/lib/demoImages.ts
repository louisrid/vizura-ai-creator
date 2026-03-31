export const createEmojiPosterDataUrl = (emoji: string) => {
  const safeEmoji = emoji.replace(/[&<>"']/g, "");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024" fill="none">
      <rect width="768" height="1024" fill="hsl(0 0% 6%)"/>
      <rect x="28" y="28" width="712" height="968" rx="48" fill="hsl(0 0% 10%)" stroke="hsl(0 0% 100% / 0.12)" stroke-width="8"/>
      <circle cx="384" cy="320" r="180" fill="hsl(220 86% 54% / 0.26)"/>
      <circle cx="384" cy="320" r="116" fill="hsl(215 84% 44% / 0.3)"/>
      <text x="384" y="430" text-anchor="middle" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" font-size="180">${safeEmoji}</text>
      <rect x="186" y="618" width="396" height="30" rx="15" fill="hsl(0 0% 100% / 0.15)"/>
      <rect x="232" y="670" width="304" height="22" rx="11" fill="hsl(0 0% 100% / 0.1)"/>
      <rect x="214" y="778" width="340" height="112" rx="56" fill="hsl(50 100% 50%)"/>
      <text x="384" y="848" text-anchor="middle" font-family="Plus Jakarta Sans, Arial, sans-serif" font-size="42" font-weight="800" fill="hsl(0 0% 4%)">vizura demo</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};