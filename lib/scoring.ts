import { Result, QuizMode } from "@/types";
import { v4 as uuidv4 } from "uuid";

export interface AnswerRecord {
  questionId: string;
  userAnswer: string;
}

interface ScoredAnswer extends AnswerRecord {
  correct: boolean;
}

export interface ScoreResult {
  id: string;
  quiz_id: string;
  mode: QuizMode;
  score: number;
  correctCount: number;
  total: number;
  xp: number;
  tag_breakdown: Result["tag_breakdown"];
  wrong_question_ids: string[];
  grading_type: "auto";
  taken_at: string;
  time_taken?: number;
}

function calcXP(correctCount: number, total: number, mode: QuizMode): number {
  const base = correctCount * (mode === "exam" ? 15 : 10);
  const ratio = total > 0 ? correctCount / total : 0;
  const bonus = ratio >= 1 ? 50 : ratio >= 0.9 ? 25 : ratio >= 0.8 ? 10 : 0;
  return base + bonus;
}

export function scoreQuiz(
  quizId: string,
  mode: QuizMode,
  answers: AnswerRecord[],
  correctAnswers: Record<string, string>,
  timeTaken?: number
): ScoreResult {
  const scored: ScoredAnswer[] = answers.map((a) => ({
    ...a,
    // Missing question IDs (deleted/edited questions) are treated as wrong
    correct: correctAnswers[a.questionId] !== undefined
      && a.userAnswer === correctAnswers[a.questionId],
  }));

  const correctCount = scored.filter((a) => a.correct).length;
  const total = answers.length;
  const wrongIds = scored.filter((a) => !a.correct).map((a) => a.questionId);

  return {
    id: uuidv4(),
    quiz_id: quizId,
    mode,
    score: total > 0 ? correctCount / total : 0,
    correctCount,
    total,
    xp: calcXP(correctCount, total, mode),
    tag_breakdown: {},
    wrong_question_ids: wrongIds,
    grading_type: "auto",
    taken_at: new Date().toISOString(),
    ...(timeTaken !== undefined && { time_taken: timeTaken }),
  };
}

export function isCorrect(correctAnswer: string, userAnswer: string): boolean {
  return correctAnswer.trim().toLowerCase() === userAnswer.trim().toLowerCase();
}
