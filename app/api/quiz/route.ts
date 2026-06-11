import { NextRequest, NextResponse } from "next/server";
import { sampleQuestions, saveQuiz } from "@/lib/questions";
import { createClient } from "@/lib/supabase/server";
import { QuizFilter, Difficulty, QuizSize, QuizMode } from "@/types";
import { v4 as uuidv4 } from "uuid";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const filter: QuizFilter = {
      tags: Array.isArray(body.tags) ? body.tags : [],
      difficulty: (body.difficulty as Difficulty | "mixed") ?? "mixed",
      size: (body.size as QuizSize) ?? 10,
      mode: (body.mode as QuizMode) ?? "ordinary",
      subject: body.subject,
    };

    const questions = await sampleQuestions(filter);
    if (questions.length === 0) {
      return NextResponse.json(
        { error: "No questions found for the selected filters. Try broadening your selection." },
        { status: 400 }
      );
    }

    const quiz = {
      id: uuidv4(),
      title: `Quiz — ${new Date().toLocaleString()}`,
      tags: filter.tags,
      difficulty_mix: filter.difficulty,
      mode: filter.mode,
      question_ids: questions.map((q) => q.id),
      created_at: new Date().toISOString(),
    };

    await saveQuiz(quiz, user.id);

    return NextResponse.json({ id: quiz.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
