import { NextRequest, NextResponse } from "next/server";
import { getQuizById, getQuestions, getSubjects, getResults, saveResult } from "@/lib/questions";
import { scoreQuiz } from "@/lib/scoring";
import { QuizMode } from "@/types";

export async function GET() {
  try {
    const results = getResults();
    const allQuestions = getQuestions();
    const subjects = getSubjects();
    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

    const enriched = results
      .sort((a, b) => new Date(b.taken_at).getTime() - new Date(a.taken_at).getTime())
      .map((r) => {
        const quiz = getQuizById(r.quiz_id);
        let subject = "Mixed";
        let difficulty: string = quiz?.difficulty_mix ?? "mixed";

        if (quiz) {
          const firstQ = allQuestions.find((q) => q.id === quiz.question_ids[0]);
          if (firstQ?.subject) subject = subjectMap.get(firstQ.subject) ?? firstQ.subject;
        }

        return {
          id: r.id,
          mode: r.mode,
          score: r.score,
          correct: r.correct,
          total_questions: r.total_questions,
          taken_at: r.taken_at,
          time_taken: r.time_taken,
          subject,
          difficulty,
        };
      });

    return NextResponse.json(enriched);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { quizId, answers, timeTaken } = await req.json();

    const quiz = getQuizById(quizId);
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    const allQuestions = getQuestions();
    const questions = quiz.question_ids
      .map((id: string) => allQuestions.find((q) => q.id === id))
      .filter(Boolean) as typeof allQuestions;

    const mode: QuizMode = quiz.mode ?? "ordinary";
    const result = scoreQuiz(quizId, mode, questions, answers, typeof timeTaken === "number" ? timeTaken : undefined);

    // DEV-ONLY: replace with Supabase in Phase 2
    saveResult(result);

    return NextResponse.json({ id: result.id });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
