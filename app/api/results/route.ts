import { NextRequest, NextResponse } from "next/server";
import { getQuizById, getQuestions, getSubjects } from "@/lib/questions";
import { scoreQuiz } from "@/lib/scoring";
import { createClient } from "@/lib/supabase/server";
import { ACHIEVEMENTS, checkAchievements, calcBonusXP, type ResultSummary } from "@/lib/achievements";
import { QuizMode } from "@/types";

function calcXP(correct: number, total: number, mode: QuizMode): number {
  const base = correct * (mode === "exam" ? 15 : 10);
  const ratio = total > 0 ? correct / total : 0;
  const bonus = ratio >= 1 ? 50 : ratio >= 0.9 ? 25 : ratio >= 0.8 ? 10 : 0;
  return base + bonus;
}

function calcStreak(lastQuizAt: string | null): {
  newStreak: number;
  streakChanged: boolean;
} {
  if (!lastQuizAt) return { newStreak: 1, streakChanged: true };

  const lastDate = new Date(lastQuizAt).toISOString().split("T")[0];
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];

  if (lastDate === today) return { newStreak: 0, streakChanged: false }; // already played today
  if (lastDate === yesterday) return { newStreak: 1, streakChanged: true }; // extend streak
  return { newStreak: 1, streakChanged: true }; // streak broken, reset to 1 (this quiz)
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: results, error } = await supabase
      .from("results")
      .select("*")
      .eq("user_id", user.id)
      .order("taken_at", { ascending: false });

    if (error) throw new Error(error.message);

    const allQuestions = await getQuestions();
    const subjects = getSubjects();
    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));

    const enriched = await Promise.all(
      (results ?? []).map(async (r) => {
        const quiz = await getQuizById(r.quiz_id);
        let subject = "Mixed";
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
          difficulty: quiz?.difficulty_mix ?? "mixed",
        };
      })
    );

    return NextResponse.json(enriched);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { quizId, answers, timeTaken } = await req.json();

    const quiz = await getQuizById(quizId);
    if (!quiz) return NextResponse.json({ error: "Quiz not found" }, { status: 404 });

    const allQuestions = await getQuestions();
    const questions = quiz.question_ids
      .map((id: string) => allQuestions.find((q) => q.id === id))
      .filter(Boolean) as typeof allQuestions;

    const mode: QuizMode = quiz.mode ?? "ordinary";
    const result = scoreQuiz(
      quizId,
      mode,
      questions,
      answers,
      typeof timeTaken === "number" ? timeTaken : undefined
    );

    // Save result
    const { error: insertError } = await supabase
      .from("results")
      .insert({ ...result, user_id: user.id });
    if (insertError) throw new Error(insertError.message);

    // XP from quiz performance
    const quizXP = calcXP(result.correct, result.total_questions, mode);

    // Load profile for streak + XP update
    const { data: profile } = await supabase
      .from("profiles")
      .select("total_xp, current_streak, longest_streak, last_quiz_at")
      .eq("id", user.id)
      .single();

    const { newStreak, streakChanged } = calcStreak(profile?.last_quiz_at ?? null);
    const updatedStreak = streakChanged
      ? (profile?.current_streak ?? 0) + newStreak
      : profile?.current_streak ?? 0;
    const updatedLongest = Math.max(profile?.longest_streak ?? 0, updatedStreak);

    // Achievement check — fetch all results for context
    const { data: allResults } = await supabase
      .from("results")
      .select("score, correct, total_questions, taken_at")
      .eq("user_id", user.id)
      .order("taken_at", { ascending: false });

    const { data: unlockedRows } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", user.id);

    const alreadyUnlocked = (unlockedRows ?? []).map((r) => r.achievement_id);

    const subjects = getSubjects();
    const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
    const firstQ = allQuestions.find((q) => q.id === quiz.question_ids[0]);
    const latestSubject = firstQ?.subject
      ? (subjectMap.get(firstQ.subject) ?? firstQ.subject)
      : "Mixed";

    const resultSummaries: ResultSummary[] = (allResults ?? []).map((r) => ({
      score: r.score,
      correct: r.correct,
      total_questions: r.total_questions,
      taken_at: r.taken_at,
      subject: latestSubject, // simplified — only current subject available without joins
    }));

    const ctx = {
      results: resultSummaries,
      latestScore: result.score,
      latestCorrect: result.correct,
      latestTotal: result.total_questions,
      latestSubject,
      currentStreak: updatedStreak,
    };
    const newAchievements = checkAchievements(ctx, alreadyUnlocked);
    const achievementXP = calcBonusXP(newAchievements);

    if (newAchievements.length > 0) {
      const rows = newAchievements.map((id) => ({ user_id: user.id, achievement_id: id }));
      await supabase.from("user_achievements").upsert(rows, { onConflict: "user_id,achievement_id" });
    }

    const totalNewXP = quizXP + achievementXP;
    const profileUpdate: Record<string, unknown> = {
      total_xp: (profile?.total_xp ?? 0) + totalNewXP,
      last_quiz_at: new Date().toISOString(),
    };
    if (streakChanged) {
      profileUpdate.current_streak = updatedStreak;
      profileUpdate.longest_streak = updatedLongest;
    }
    await supabase.from("profiles").update(profileUpdate).eq("id", user.id);

    return NextResponse.json({ id: result.id, xp: quizXP, newAchievements });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
