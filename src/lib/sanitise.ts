/**
 * Strip angle brackets, control characters, and cap length.
 * Used on every user text input before it hits the DB or an edge function.
 */
export function sanitiseText(raw: string, maxLength = 1000): string {
  return raw
    .replace(/[<>]/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, maxLength);
}