
export type AchievementCategory = "performance" | "consistency" | "exploration" | "volume";

export type Achievement = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  icon: string; // lucide-react icon name
  xpReward: number;
  check: (ctx: AchievementContext) => boolean;
};

export type AchievementContext = {
  results: ResultSummary[];
  latestScore: number; // 0–1
  latestCorrect: number;
  latestTotal: number;
  latestSubject: string;
  currentStreak: number;
};

export type ResultSummary = {
  score: number;
  correct: number;
  total_questions: number;
  taken_at: string;
  subject: string;
};

function uniqueSubjects(results: ResultSummary[]): number {
  return new Set(results.map((r) => r.subject)).size;
}

function consecutiveStreak(results: ResultSummary[]): number {
  if (!results.length) return 0;
  const uniqueDates = [...new Set(results.map((r) => r.taken_at.split("T")[0]))]
    .sort()
    .reverse();
  const today = new Date().toISOString().split("T")[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;
  let streak = 1;
  for (let i = 1; i < uniqueDates.length; i++) {
    const prev = new Date(uniqueDates[i - 1]).getTime();
    const curr = new Date(uniqueDates[i]).getTime();
    if ((prev - curr) / 86400000 === 1) streak++;
    else break;
  }
  return streak;
}

export const ACHIEVEMENTS: Achievement[] = [
  // Performance
  {
    id: "first_quiz",
    title: "First Step",
    description: "Complete your first quiz.",
    category: "performance",
    icon: "Star",
    xpReward: 50,
    check: ({ results }) => results.length >= 1,
  },
  {
    id: "perfect_score",
    title: "Perfectionist",
    description: "Score 100% on any quiz.",
    category: "performance",
    icon: "Award",
    xpReward: 100,
    check: ({ latestScore }) => latestScore >= 1,
  },
  {
    id: "high_achiever",
    title: "High Achiever",
    description: "Score 90% or above on 5 different quizzes.",
    category: "performance",
    icon: "TrendingUp",
    xpReward: 150,
    check: ({ results }) => results.filter((r) => r.score >= 0.9).length >= 5,
  },
  {
    id: "passing_grade",
    title: "Passing Grade",
    description: "Score 80% or above on 10 quizzes.",
    category: "performance",
    icon: "CheckCircle",
    xpReward: 100,
    check: ({ results }) => results.filter((r) => r.score >= 0.8).length >= 10,
  },
  {
    id: "comeback",
    title: "Comeback Kid",
    description: "Score 90%+ after a previous quiz below 50%.",
    category: "performance",
    icon: "RefreshCw",
    xpReward: 75,
    check: ({ results }) => {
      const sorted = [...results].sort(
        (a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
      );
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i - 1].score < 0.5 && sorted[i].score >= 0.9) return true;
      }
      return false;
    },
  },

  // Consistency
  {
    id: "streak_3",
    title: "Warm Up",
    description: "Maintain a 3-day quiz streak.",
    category: "consistency",
    icon: "Flame",
    xpReward: 50,
    check: ({ results }) => consecutiveStreak(results) >= 3,
  },
  {
    id: "streak_7",
    title: "On a Roll",
    description: "Maintain a 7-day quiz streak.",
    category: "consistency",
    icon: "Zap",
    xpReward: 150,
    check: ({ results }) => consecutiveStreak(results) >= 7,
  },
  {
    id: "streak_30",
    title: "Dedicated",
    description: "Maintain a 30-day quiz streak.",
    category: "consistency",
    icon: "Calendar",
    xpReward: 500,
    check: ({ results }) => consecutiveStreak(results) >= 30,
  },
  {
    id: "daily_habit",
    title: "Daily Habit",
    description: "Complete at least one quiz on 14 different days.",
    category: "consistency",
    icon: "CalendarCheck",
    xpReward: 200,
    check: ({ results }) =>
      new Set(results.map((r) => r.taken_at.split("T")[0])).size >= 14,
  },

  // Exploration
  {
    id: "curious_mind",
    title: "Curious Mind",
    description: "Try quizzes in 3 different subjects.",
    category: "exploration",
    icon: "Globe",
    xpReward: 75,
    check: ({ results }) => uniqueSubjects(results) >= 3,
  },
  {
    id: "polymath",
    title: "Polymath",
    description: "Try quizzes in 5 different subjects.",
    category: "exploration",
    icon: "BookOpen",
    xpReward: 150,
    check: ({ results }) => uniqueSubjects(results) >= 5,
  },
  {
    id: "deep_dive",
    title: "Deep Dive",
    description: "Complete 5 quizzes in the same subject.",
    category: "exploration",
    icon: "Layers",
    xpReward: 100,
    check: ({ results }) => {
      const counts = new Map<string, number>();
      for (const r of results) counts.set(r.subject, (counts.get(r.subject) ?? 0) + 1);
      return Math.max(0, ...counts.values()) >= 5;
    },
  },

  // Volume
  {
    id: "quiz_5",
    title: "Getting Started",
    description: "Complete 5 quizzes.",
    category: "volume",
    icon: "Play",
    xpReward: 50,
    check: ({ results }) => results.length >= 5,
  },
  {
    id: "quiz_25",
    title: "Quiz Veteran",
    description: "Complete 25 quizzes.",
    category: "volume",
    icon: "Trophy",
    xpReward: 200,
    check: ({ results }) => results.length >= 25,
  },
  {
    id: "quiz_50",
    title: "Marathon Runner",
    description: "Complete 50 quizzes.",
    category: "volume",
    icon: "Medal",
    xpReward: 500,
    check: ({ results }) => results.length >= 50,
  },
];

export function checkAchievements(
  ctx: AchievementContext,
  alreadyUnlocked: string[]
): string[] {
  const already = new Set(alreadyUnlocked);
  const newlyUnlocked: string[] = [];

  for (const a of ACHIEVEMENTS) {
    if (!already.has(a.id) && a.check(ctx)) {
      newlyUnlocked.push(a.id);
    }
  }

  return newlyUnlocked;
}

export function calcBonusXP(newIds: string[]): number {
  return newIds.reduce((sum, id) => {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    return sum + (a?.xpReward ?? 0);
  }, 0);
}
