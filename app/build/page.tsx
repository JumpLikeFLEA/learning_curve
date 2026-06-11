import { getSubjects, getQuestions } from "@/lib/questions";
import BuildForm from "./BuildForm";
import type { SubjectCardData } from "@/app/components/SubjectGrid";

export default function BuildPage() {
  const subjects = getSubjects();
  const questions = getQuestions();

  const subjectCards: SubjectCardData[] = subjects.map((s) => {
    const qs = questions.filter((q) => q.subject === s.id);
    const diffSet = Array.from(new Set(qs.map((q) => q.difficulty)));
    const diffOrder = ["easy", "medium", "hard"] as const;
    return {
      id: s.id,
      name: s.name,
      icon: s.icon,
      color: s.color,
      bg: s.bg,
      questionCount: qs.length,
      difficulties: diffOrder.filter((d) => diffSet.includes(d)),
    };
  });

  const subtopicsBySubject = Object.fromEntries(
    subjects.map((s) => [s.id, s.subtopics]),
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Build a Quiz</h1>
        <p className="mt-1 text-muted-foreground">
          Pick a subject, narrow by subtopic, then configure difficulty and length.
        </p>
      </div>
      <BuildForm subjects={subjectCards} subtopicsBySubject={subtopicsBySubject} />
    </div>
  );
}
