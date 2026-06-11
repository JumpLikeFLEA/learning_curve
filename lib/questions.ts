import fs from "fs";
import path from "path";
import { Question, Quiz, Result, QuizFilter, Subject } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");

function readJson<T>(filename: string): T {
  const raw = fs.readFileSync(path.join(DATA_DIR, filename), "utf-8");
  return JSON.parse(raw) as T;
}

// DEV-ONLY: replace with Supabase in Phase 2
function writeJson<T>(filename: string, data: T): void {
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2));
}

export function getQuestions(): Question[] {
  return readJson<Question[]>("questions.json");
}

export function getSubjects(): Subject[] {
  return readJson<Subject[]>("subjects.json");
}

export function getQuizById(id: string): Quiz | undefined {
  const quizzes = readJson<Quiz[]>("quizzes.json");
  return quizzes.find((q) => q.id === id);
}

export function getResults(): Result[] {
  return readJson<Result[]>("results.json");
}

// DEV-ONLY: replace with Supabase in Phase 2
export function saveResult(result: Result): void {
  const results = getResults();
  results.push(result);
  writeJson("results.json", results);
}

// DEV-ONLY: replace with Supabase in Phase 2
export function saveQuiz(quiz: Quiz): void {
  const quizzes = readJson<Quiz[]>("quizzes.json");
  quizzes.push(quiz);
  writeJson("quizzes.json", quizzes);
}

// DEV-ONLY: replace with Supabase in Phase 2
export function saveQuestions(newQuestions: Question[]): void {
  const existing = getQuestions();
  writeJson("questions.json", [...existing, ...newQuestions]);
}

export function sampleQuestions(filter: QuizFilter): Question[] {
  const all = getQuestions();

  // If a subject is provided but no explicit tags, resolve tags from subjects.json
  let effectiveTags = filter.tags;
  if (filter.subject && effectiveTags.length === 0) {
    const subjects = getSubjects();
    const subject = subjects.find((s) => s.id === filter.subject);
    if (subject) effectiveTags = subject.tags;
  }

  const pool = all.filter((q) => {
    const tagMatch =
      effectiveTags.length === 0 || q.tags.some((t) => effectiveTags.includes(t));
    const diffMatch =
      filter.difficulty === "mixed" || q.difficulty === filter.difficulty;
    return tagMatch && diffMatch;
  });

  const count = filter.mode === "exam" ? 50 : filter.size;
  return shuffle(pool).slice(0, count);
}

export function getAllTags(): string[] {
  const questions = getQuestions();
  const tagSet = new Set<string>();
  questions.forEach((q) => q.tags.forEach((t) => tagSet.add(t)));
  return Array.from(tagSet).sort();
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
