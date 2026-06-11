import path from "path";
import fs from "fs";
import { Question, Quiz, Result, QuizFilter, Subject } from "@/types";
import { createClient } from "@/lib/supabase/server";

// subjects.json stays on disk — it's static config, not user data
const DATA_DIR = path.join(process.cwd(), "data");

export function getSubjects(): Subject[] {
  const raw = fs.readFileSync(path.join(DATA_DIR, "subjects.json"), "utf-8");
  return JSON.parse(raw) as Subject[];
}

export async function getQuestions(): Promise<Question[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("questions").select("*");
  if (error) throw new Error(error.message);
  return (data ?? []) as Question[];
}

export async function getQuizById(id: string): Promise<Quiz | undefined> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return undefined;
  return data as Quiz;
}

export async function getResults(): Promise<Result[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from("results")
    .select("*")
    .eq("user_id", user.id)
    .order("taken_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as Result[];
}

export async function saveResult(result: Result, userId: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("results")
    .insert({ ...result, user_id: userId });
  if (error) throw new Error(error.message);
}

export async function saveQuiz(quiz: Quiz, userId?: string): Promise<void> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("quizzes")
    .insert({ ...quiz, created_by: userId ?? null });
  if (error) throw new Error(error.message);
}

export async function saveQuestions(newQuestions: Question[], userId?: string): Promise<void> {
  const supabase = await createClient();
  const rows = newQuestions.map((q) => ({
    ...q,
    created_by: userId ?? null,
  }));
  const { error } = await supabase.from("questions").insert(rows);
  if (error) throw new Error(error.message);
}

export async function sampleQuestions(filter: QuizFilter): Promise<Question[]> {
  const supabase = await createClient();

  let effectiveTags = filter.tags;
  if (filter.subject && effectiveTags.length === 0) {
    const subjects = getSubjects();
    const subject = subjects.find((s) => s.id === filter.subject);
    if (subject) effectiveTags = subject.tags;
  }

  let query = supabase.from("questions").select("*");

  if (filter.difficulty !== "mixed") {
    query = query.eq("difficulty", filter.difficulty);
  }
  if (effectiveTags.length > 0) {
    query = query.overlaps("tags", effectiveTags);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const pool = (data ?? []) as Question[];
  const count = filter.mode === "exam" ? 50 : filter.size;
  return shuffle(pool).slice(0, count);
}

export async function getAllTags(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("questions").select("tags");
  if (error) throw new Error(error.message);
  const tagSet = new Set<string>();
  (data ?? []).forEach((row: { tags: string[] }) => row.tags.forEach((t) => tagSet.add(t)));
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
