export type ForgeSkill =
  | "focus"
  | "control"
  | "patience"
  | "persistence"
  | "consistency";

export type ForgeEventName =
  | "session_started"
  | "session_completed"
  | "trial_started"
  | "trial_completed"
  | "difficulty_changed"
  | "mistake"
  | "recovery"
  | "reveal_used"
  | "rest_started"
  | "rest_completed";

export type ForgeDifficulty = {
  level: number;
  score: number;
  confidence: number;
};

export type ForgeEvent = {
  id: string;
  sessionId: string;
  timestamp: number;
  skill: ForgeSkill;
  game: string;
  event: ForgeEventName;
  difficulty?: ForgeDifficulty;
  payload?: Record<string, number | string | boolean | null>;
};

export type ForgeSkillState = {
  skill: ForgeSkill;
  rating: number;
  confidence: number;
  attempts: number;
  successes: number;
  recentPerformance: number[];
  lastPlayedAt: number | null;
  lastDifficulty: number;
};

export type ForgePlayerModel = {
  version: 1;
  skills: Record<ForgeSkill, ForgeSkillState>;
  updatedAt: number;
};

const EVENTS_KEY = "forge.analytics.events.v1";
const MODEL_KEY = "forge.analytics.model.v1";
const MAX_EVENTS = 2500;

const SKILLS: ForgeSkill[] = [
  "focus",
  "control",
  "patience",
  "persistence",
  "consistency",
];

function makeId(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function defaultSkill(skill: ForgeSkill): ForgeSkillState {
  return {
    skill,
    rating: 0.5,
    confidence: 0,
    attempts: 0,
    successes: 0,
    recentPerformance: [],
    lastPlayedAt: null,
    lastDifficulty: 1,
  };
}

function defaultModel(): ForgePlayerModel {
  return {
    version: 1,
    skills: Object.fromEntries(SKILLS.map((skill) => [skill, defaultSkill(skill)])) as Record<ForgeSkill, ForgeSkillState>,
    updatedAt: Date.now(),
  };
}

export function getPlayerModel(): ForgePlayerModel {
  if (typeof window === "undefined") return defaultModel();

  try {
    const raw = window.localStorage.getItem(MODEL_KEY);
    if (!raw) return defaultModel();
    const parsed = JSON.parse(raw) as ForgePlayerModel;
    if (parsed.version !== 1 || !parsed.skills) return defaultModel();
    return parsed;
  } catch {
    return defaultModel();
  }
}

export function savePlayerModel(model: ForgePlayerModel) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MODEL_KEY, JSON.stringify(model));
}

export function getAnalyticsEvents(): ForgeEvent[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(EVENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function recordEvent(
  event: Omit<ForgeEvent, "id" | "timestamp">,
): ForgeEvent {
  const next: ForgeEvent = {
    ...event,
    id: makeId("evt"),
    timestamp: Date.now(),
  };

  if (typeof window === "undefined") return next;

  const events = [...getAnalyticsEvents(), next].slice(-MAX_EVENTS);
  window.localStorage.setItem(EVENTS_KEY, JSON.stringify(events));

  return next;
}

export function startForgeSession(
  skill: ForgeSkill,
  game: string,
  payload?: ForgeEvent["payload"],
) {
  const sessionId = makeId("session");
  recordEvent({
    sessionId,
    skill,
    game,
    event: "session_started",
    payload,
  });
  return sessionId;
}

export function updateSkillModel(
  skill: ForgeSkill,
  performance: number,
  difficulty: number,
  success: boolean,
) {
  const model = getPlayerModel();
  const current = model.skills[skill];
  const normalized = Math.max(0, Math.min(1, performance));
  const recent = [...current.recentPerformance, normalized].slice(-12);

  // Early sessions learn quickly; later sessions stabilize.
  const learningRate = Math.max(0.08, 0.28 / Math.sqrt(current.attempts + 1));
  const rating = current.attempts === 0
    ? normalized
    : current.rating + (normalized - current.rating) * learningRate;

  model.skills[skill] = {
    ...current,
    rating,
    confidence: Math.min(1, current.confidence + 0.06),
    attempts: current.attempts + 1,
    successes: current.successes + (success ? 1 : 0),
    recentPerformance: recent,
    lastPlayedAt: Date.now(),
    lastDifficulty: difficulty,
  };
  model.updatedAt = Date.now();
  savePlayerModel(model);
  return model.skills[skill];
}
