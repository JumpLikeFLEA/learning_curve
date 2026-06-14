import type { Difficulty } from "@/types";

/** User-facing input to the generator. */
export interface GenerateInput {
  subject: string;          // human name, e.g. "Data Analysis" (matches Subject.name and questions.subject column)
  subjectId: string;        // slug, e.g. "data_analysis" (matches Subject.id)
  difficulty: Difficulty;   // "easy" | "medium" | "hard"
  subtopics: string[];      // Title-Case subtopic labels from Subject.subtopics, e.g. ["Pandas", "Descriptive Statistics"]
  notes?: string;           // optional free-form generation steering ("focus on real-world scenarios", etc.)
  count: number;            // batch size (default 5)
}

/** Raw question as emitted by the generator LLM, before tagging/hashing/critique. */
export interface RawQuestion {
  question: string;
  options: [string, string, string, string];
  correct_answer: string;
  explanation: string;
  subtopic: string;         // which subtopic from the input list this question covers (Title Case)
}

/** Structured critic feedback for a single question. */
export interface CriticReport {
  correctness_check: "pass" | "fail" | "unsure";
  ambiguity_check: "pass" | "fail" | "unsure";
  distractor_quality: 1 | 2 | 3 | 4 | 5;
  notes: string;
}

/** Fully-assembled question, ready for DB insert. Mirrors the questions table columns. */
export interface GeneratedQuestion {
  id: string;
  type: "multiple_choice";
  subject: string;
  tags: string[];                       // lowercase via slugifyForTag()
  difficulty: Difficulty;
  question: string;
  options: [string, string, string, string];
  correct_answer: string;
  explanation: string;
  source: "ai_generated";
  status: "pending";
  content_hash: string;
  critic_notes: CriticReport;
  generation_batch_id: string;
}
