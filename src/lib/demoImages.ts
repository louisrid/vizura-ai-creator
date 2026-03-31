export const createEmojiPosterDataUrl = (emoji: string) => {
  const safeEmoji = emoji.replace(/[&<>"']/g, "");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="768" height="768" viewBox="0 0 768 768" fill="none" data-emoji="${safeEmoji}">
      <rect width="768" height="768" rx="48" fill="hsl(0 0% 10%)"/>
      <rect x="8" y="8" width="752" height="752" rx="44" fill="hsl(0 0% 10%)" stroke="hsl(0 0% 100%)" stroke-width="8"/>
      <text x="384" y="430" text-anchor="middle" font-family="Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif" font-size="176">${safeEmoji}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const extractEmojiFromPosterDataUrl = (url: string | null | undefined) => {
  if (!url || !url.startsWith("data:image/svg+xml;charset=utf-8,")) return null;

  try {
    const decoded = decodeURIComponent(url.replace("data:image/svg+xml;charset=utf-8,", ""));
    const attributeMatch = decoded.match(/data-emoji="([^"]+)"/);
    if (attributeMatch?.[1]) return attributeMatch[1];

    const textMatch = decoded.match(/<text[^>]*>(.*?)<\/text>/s);
    return textMatch?.[1] ?? null;
  } catch {
    return null;
  }
};
