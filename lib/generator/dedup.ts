import crypto from "crypto";

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Deterministic content hash for a question. Same question text + same set
 * of options (regardless of order) produces the same hash.
 *
 * Returns the first 32 hex characters of a SHA-256 — more than enough
 * collision-resistance for our scale and short enough to be readable in
 * logs/DB rows.
 */
export function hashQuestion(question: string, options: readonly string[]): string {
  const parts = [normalize(question), ...options.map(normalize).sort()];
  return crypto.createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 32);
}
