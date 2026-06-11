import { notFound } from "next/navigation";
import { getQuizById, getQuestions } from "@/lib/questions";
import QuizSession from "./QuizSession";

export default async function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const quiz = getQuizById(id);
  if (!quiz) notFound();

  const allQuestions = getQuestions();
  const questions = quiz.question_ids
    .map((qid) => allQuestions.find((q) => q.id === qid))
    .filter(Boolean) as ReturnType<typeof getQuestions>;

  if (questions.length === 0) notFound();

  return <QuizSession quiz={quiz} questions={questions} />;
}
