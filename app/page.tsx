import { getSubjects, getQuestions } from "@/lib/questions";
import { SubjectGrid, type SubjectCardData } from "@/app/components/SubjectGrid";
import type { Difficulty } from "@/types";

export default function Home() {
  const subjects = getSubjects();
  const questions = getQuestions();

  const cards: SubjectCardData[] = subjects.map((subject) => {
    const qs = questions.filter((q) => q.subject === subject.id);
    const diffSet = Array.from(new Set(qs.map((q) => q.difficulty))) as Difficulty[];
    const diffOrder: Difficulty[] = ["easy", "medium", "hard"];
    const difficulties = diffOrder.filter((d) => diffSet.includes(d));

    return {
      id: subject.id,
      name: subject.name,
      icon: subject.icon,
      color: subject.color,
      bg: subject.bg,
      questionCount: qs.length,
      difficulties,
    };
  });

  return <SubjectGrid subjects={cards} />;
}
