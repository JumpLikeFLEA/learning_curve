import fs from "fs";
import path from "path";

/** Shape of an exemplar in data/seed-exemplars.json. */
export interface Exemplar {
  id: string;
  type: string;
  subject: string;
  tags: string[];
  difficulty: string;
  question: string;
  options: string[];
  correct_answer: string;
  explanation: string;
}

const EXEMPLARS_PATH = path.join(process.cwd(), "data", "seed-exemplars.json");

let cached: Exemplar[] | null = null;

function loadExemplars(): Exemplar[] {
  if (cached) return cached;
  const raw = fs.readFileSync(EXEMPLARS_PATH, "utf-8");
  cached = JSON.parse(raw) as Exemplar[];
  return cached;
}

/**
 * Pick few-shot exemplars for a generation request.
 *
 * Bootstrap behavior (current): returns all 3 seed exemplars regardless of
 * subject/difficulty. The seed file is intentionally Data Analysis (the
 * current test subject) so exemplars are on-topic for now.
 *
 * Future: when the approved bank has questions, replace with a DB lookup
 * for "top approved questions matching subject + difficulty".
 */
export function pickExemplars(_subject: string, _difficulty: string): Exemplar[] {
  return loadExemplars();
}
