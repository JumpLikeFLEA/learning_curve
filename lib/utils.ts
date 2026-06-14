import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Normalize a subtopic label (or any human-friendly tag string) to the
 * canonical lowercase form used in questions.tags[].
 *
 * Examples:
 *   slugifyForTag("Descriptive Statistics") → "descriptive statistics"
 *   slugifyForTag("Pandas") → "pandas"
 *   slugifyForTag("  SQL  ") → "sql"
 *   slugifyForTag("Window\tFunctions") → "window functions"
 */
export function slugifyForTag(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}
