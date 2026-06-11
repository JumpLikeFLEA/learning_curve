import { Question, Result, QuizMode } from "@/types";
import { v4 as uuidv4 } from "uuid";

export interface AnswerRecord {
  questionId: string;
  userAnswer: string;
  correct: boolean;
}

export function scoreQuiz(
  quizId: string,
  mode: QuizMode,
  questions: Question[],
  answers: AnswerRecord[],
  timeTaken?: number
): Result {
  const correct = answers.filter((a) => a.correct).length;
  const wrongIds = answers.filter((a) => !a.correct).map((a) => a.questionId);

  const tagBreakdown: Result["tag_breakdown"] = {};
  for (const q of questions) {
    const ans = answers.find((a) => a.questionId === q.id);
    for (const tag of q.tags) {
      if (!tagBreakdown[tag]) tagBreakdown[tag] = { correct: 0, total: 0 };
      tagBreakdown[tag].total += 1;
      if (ans?.correct) tagBreakdown[tag].correct += 1;
    }
  }

  return {
    id: uuidv4(),
    quiz_id: quizId,
    mode,
    score: questions.length > 0 ? correct / questions.length : 0,
    total_questions: questions.length,
    correct,
    tag_breakdown: tagBreakdown,
    wrong_question_ids: wrongIds,
    grading_type: "auto",
    taken_at: new Date().toISOString(),
    ...(timeTaken !== undefined && { time_taken: timeTaken }),
  };
}

export function isCorrect(question: Question, userAnswer: string): boolean {
  return question.correct_answer.trim().toLowerCase() === userAnswer.trim().toLowerCase();
}
