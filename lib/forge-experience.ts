export type ForgeSkill = "focus" | "control" | "patience" | "persistence" | "consistency";

export type ForgeAchievement = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export const FORGE_ACHIEVEMENTS: Record<string, ForgeAchievement> = {
  first_session: { id: "first_session", title: "FIRST FORGE", description: "Complete your first deliberate training session.", icon: "✦" },
  clean_control: { id: "clean_control", title: "CLEAN CONTROL", description: "Finish a Control run without a wrong tap.", icon: "◇" },
  deep_focus: { id: "deep_focus", title: "DEEP FOCUS", description: "Complete a Focus run with a clean streak of five or more.", icon: "◎" },
  patient_mind: { id: "patient_mind", title: "PATIENT MIND", description: "Complete a patience milestone.", icon: "◷" },
  memory_forged: { id: "memory_forged", title: "MEMORY FORGED", description: "Complete a memory challenge without using a reveal.", icon: "▦" },
};

const ACHIEVEMENTS_KEY = "forge.achievements.v1";
const CREDITS_KEY = "forge.credits.v1";
const LEVEL_KEY = "forge.level.v1";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function getUnlockedAchievements(): string[] {
  return readJson<string[]>(ACHIEVEMENTS_KEY, []);
}

export function unlockForgeAchievement(id: string): ForgeAchievement | null {
  const achievement = FORGE_ACHIEVEMENTS[id];
  if (!achievement || typeof window === "undefined") return null;
  const unlocked = getUnlockedAchievements();
  if (unlocked.includes(id)) return null;
  window.localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify([...unlocked, id]));
  window.dispatchEvent(new CustomEvent("forge:achievement", { detail: achievement }));
  return achievement;
}

export function getForgeLevel(): number {
  return Math.max(1, readJson<number>(LEVEL_KEY, 1));
}

export function addForgeReward(credits: number, reason: string) {
  if (typeof window === "undefined" || credits <= 0) return;
  const next = Math.max(0, Math.round(readJson<number>(CREDITS_KEY, 0) + credits));
  window.localStorage.setItem(CREDITS_KEY, String(next));
  window.dispatchEvent(new CustomEvent("forge:reward", {
    detail: { credits, reason, balance: next },
  }));
  return next;
}

export function getForgeRewardBalance(): number {
  return Math.max(0, readJson<number>(CREDITS_KEY, 0));
}

export function recordForgeSessionCompletion(skill: ForgeSkill, score = 0) {
  unlockForgeAchievement("first_session");
  const reward = 5 + Math.max(0, Math.min(20, Math.round(score / 10)));
  addForgeReward(reward, skill);
  if (skill === "control" && score >= 95) unlockForgeAchievement("clean_control");
  if (skill === "focus" && score >= 85) unlockForgeAchievement("deep_focus");
  if ((skill === "persistence" || skill === "consistency") && score >= 90) unlockForgeAchievement("memory_forged");
  if (skill === "patience" && score >= 80) unlockForgeAchievement("patient_mind");
}
