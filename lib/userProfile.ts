const STORAGE_KEY = "userProfile";
const XP_PER_LEVEL = 500;

export type UserProfile = {
  user_id: string;
  displayName: string;
  xp: number;
  level: number;
  unlockedAchievements: string[];
};

function generateId(): string {
  return "user_" + Math.random().toString(36).slice(2, 10);
}

export function getProfile(): UserProfile {
  if (typeof window === "undefined") {
    return { user_id: "", displayName: "Student", xp: 0, level: 1, unlockedAchievements: [] };
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const p = JSON.parse(raw) as Partial<UserProfile>;
      return {
        user_id: p.user_id ?? generateId(),
        displayName: p.displayName ?? "Student",
        xp: p.xp ?? 0,
        level: p.level ?? 1,
        unlockedAchievements: p.unlockedAchievements ?? [],
      };
    } catch {}
  }
  const fresh: UserProfile = {
    user_id: generateId(),
    displayName: "Student",
    xp: 0,
    level: 1,
    unlockedAchievements: [],
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  return fresh;
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

export function awardXP(amount: number): UserProfile {
  const profile = getProfile();
  const newXP = profile.xp + amount;
  const newLevel = Math.max(1, Math.floor(newXP / XP_PER_LEVEL) + 1);
  const updated = { ...profile, xp: newXP, level: newLevel };
  saveProfile(updated);
  return updated;
}

export function unlockAchievements(ids: string[]): UserProfile {
  const profile = getProfile();
  const merged = Array.from(new Set([...profile.unlockedAchievements, ...ids]));
  const updated = { ...profile, unlockedAchievements: merged };
  saveProfile(updated);
  return updated;
}

export function xpForLevel(level: number): number {
  return level * XP_PER_LEVEL;
}
