import { notFound } from "next/navigation";
import { getQuizById, getQuestions } from "@/lib/questions";
import { shuffleOptions } from "@/lib/shuffleOptions";
import QuizSession from "./QuizSession";
import type { Question, Quiz } from "@/types";

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [quiz, allQuestions] = await Promise.all([getQuizById(id), getQuestions()]);
  if (!quiz) notFound();

  const questions = (quiz as Quiz).question_ids
    .map((qid) => (allQuestions as Question[]).find((q) => q.id === qid))
    .filter(Boolean) as Question[];

  if (questions.length === 0) notFound();

  const shuffledQuestions = questions.map((q) => ({
    ...q,
    options: shuffleOptions(q.options, `${id}:${q.id}`) as [string, string, string, string],
  }));

  return <QuizSession quiz={quiz as Quiz} questions={shuffledQuestions} />;
}
