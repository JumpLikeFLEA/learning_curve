import { getSubjects, getSubjectStats } from "@/lib/questions";
import { SubjectGrid, type SubjectCardData } from "@/app/components/SubjectGrid";

export default async function Home() {
  const subjects = getSubjects();
  const stats = await getSubjectStats();

  const cards: SubjectCardData[] = subjects
    .map((subject) => {
      const { count, difficulties } = stats[subject.id] ?? { count: 0, difficulties: [] };
      return {
        id: subject.id,
        name: subject.name,
        icon: subject.icon,
        color: subject.color,
        bg: subject.bg,
        questionCount: count,
        difficulties,
      };
    })
    .filter((card) => card.questionCount > 0);

  return <SubjectGrid subjects={cards} />;
}
