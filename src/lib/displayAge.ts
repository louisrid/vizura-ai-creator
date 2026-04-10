/**
 * Display-only age randomizer.
 * Caches per raw value so repeated calls in the same page view return the same number.
 */
const cache = new Map<string, number>();

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function displayAge(storedAge: string | undefined | null): string {
  if (!storedAge) return "—";

  const key = storedAge.trim().toLowerCase();
  if (cache.has(key)) return String(cache.get(key)!);

  const num = parseInt(key, 10);
  let result: number;

  if (key === "18-24" || key === "18" || (!isNaN(num) && num <= 24)) {
    result = rand(18, 23);
  } else {
    // "24+", "25", or any value > 24
    result = rand(24, 29);
  }

  cache.set(key, result);
  return String(result);
}
