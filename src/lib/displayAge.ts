/**
 * Display-only age randomizer.
 * Generates a random display age once per character and persists it in localStorage
 * so it stays consistent across all pages and sessions.
 */

const STORAGE_KEY = "vizura_display_ages";

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getPersistedMap(): Record<string, number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function persistMap(map: Record<string, number>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {}
}

/**
 * Returns a consistent random display age for a character.
 * @param characterId - unique character ID (used as persistence key)
 * @param storedAge - the raw age value from the database
 */
export function displayAge(characterId: string, storedAge: string | undefined | null): string {
  if (!storedAge) return "—";

  const map = getPersistedMap();
  if (map[characterId] != null) return String(map[characterId]);

  const key = storedAge.trim().toLowerCase();
  const num = parseInt(key, 10);
  let result: number;

  if (key === "18-24" || key === "18" || (!isNaN(num) && num <= 24)) {
    result = rand(18, 23);
  } else {
    result = rand(24, 29);
  }

  map[characterId] = result;
  persistMap(map);
  return String(result);
}
