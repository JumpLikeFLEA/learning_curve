import { NextRequest, NextResponse } from "next/server";
import { getQuestions, saveQuestions, saveQuiz } from "@/lib/questions";
import { Question, Quiz, Difficulty, QuizMode } from "@/types";

type IncomingQuestion = {
  question: string;
  type: "multiple_choice" | "true_false";
  options: [string, string, string, string];
  correct_answer: string;
  explanation: string;
  difficulty: Difficulty;
  tags: string[];
};

type RequestBody = {
  title: string;
  subject: string;
  mode: QuizMode;
  difficulty: Difficulty | "mixed";
  questions: IncomingQuestion[];
  created_by?: string | null;
};

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export async function POST(req: NextRequest) {
  try {
    const body: RequestBody = await req.json();

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (!body.subject?.trim()) {
      return NextResponse.json({ error: "subject is required" }, { status: 400 });
    }
    if (!Array.isArray(body.questions) || body.questions.length === 0) {
      return NextResponse.json({ error: "at least one question is required" }, { status: 400 });
    }

    const now = new Date().toISOString();
    const existingQuestions = getQuestions();
    const existingIds = new Set(existingQuestions.map((q) => q.id));

    const newQuestions: Question[] = body.questions.map((q) => {
      let id = generateId("q");
      while (existingIds.has(id)) id = generateId("q");
      existingIds.add(id);

      const options: [string, string, string, string] =
        q.type === "true_false"
          ? ["True", "False", "", ""]
          : q.options;

      return {
        id,
        type: "multiple_choice",
        subject: body.subject,
        tags: q.tags ?? [],
        difficulty: q.difficulty,
        question: q.question,
        options,
        correct_answer: q.correct_answer,
        explanation: q.explanation ?? "",
        created_at: now,
        source: "manual" as const,
        created_by: body.created_by ?? null,
      };
    });

    saveQuestions(newQuestions);

    const quiz: Quiz = {
      id: generateId("quiz"),
      title: body.title,
      tags: [...new Set(newQuestions.flatMap((q) => q.tags))],
      difficulty_mix: body.difficulty,
      question_ids: newQuestions.map((q) => q.id),
      created_at: now,
      mode: body.mode,
      created_by: body.created_by ?? null,
    };

    saveQuiz(quiz);

    return NextResponse.json({ quizId: quiz.id, questionCount: newQuestions.length });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
