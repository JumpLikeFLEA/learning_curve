"use client";

import { useEffect } from "react";
import { awardXP, unlockAchievements } from "@/lib/userProfile";
import { checkAchievements, applyNewAchievements, type ResultSummary } from "@/lib/achievements";

type Props = {
  resultId: string;
  xp: number;
  latestScore: number;
  latestCorrect: number;
  latestTotal: number;
  latestSubject: string;
};

export default function XPAwarder({
  resultId,
  xp,
  latestScore,
  latestCorrect,
  latestTotal,
  latestSubject,
}: Props) {
  useEffect(() => {
    const key = `xp_awarded_${resultId}`;
    if (localStorage.getItem(key)) return;

    // Award quiz XP first
    const afterQuiz = awardXP(xp);

    // Fetch full results to check achievements
    fetch("/api/results")
      .then((r) => r.json())
      .then((data: ResultSummary[]) => {
        if (!Array.isArray(data)) return;
        const ctx = {
          results: data,
          latestScore,
          latestCorrect,
          latestTotal,
          latestSubject,
          currentStreak: 0,
        };
        const newIds = checkAchievements(ctx);
        const { bonusXP } = applyNewAchievements(newIds, afterQuiz);
        if (bonusXP > 0) awardXP(bonusXP);
        else unlockAchievements([]); // no-op, profile already saved
      })
      .catch(() => {});

    localStorage.setItem(key, "1");
  }, [resultId, xp, latestScore, latestCorrect, latestTotal, latestSubject]);

  return null;
}
