export const createEmojiPosterDataUrl = (emoji: string) => {
  const safeEmoji = emoji.replace(/[&<>"']/g, "");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="768" height="1024" viewBox="0 0 768 1024" fill="none">
      <rect width="768" height="1024" rx="48" fill="hsl(0 0% 10%)"/>
      <rect x="8" y="8" width="752" height="1008" rx="44" fill="hsl(0 0% 10%)" stroke="hsl(0 0% 25%)" stroke-width="8"/>
      <text x="384" y="560" text-anchor="middle" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" font-size="200">${safeEmoji}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};
