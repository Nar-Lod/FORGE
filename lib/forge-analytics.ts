import { ingestForgeEvent } from "./forge-data";
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

export type ForgePerformanceVector = {
  accuracy: number;
  reactionControl: number;
  memoryLoad: number;
  recovery: number;
  consistency: number;
  difficulty: number;
  fatigue: number;
  restQuality: number;
};

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
  performance?: Partial<ForgePerformanceVector>;
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
  dimensions: ForgePerformanceVector;
};

export type ForgePlayerModel = {
  version: 2;
  skills: Record<ForgeSkill, ForgeSkillState>;
  updatedAt: number;
  crossSkill: Record<string, number>;
};

const EVENTS_KEY = "forge.analytics.events.v2";
const MODEL_KEY = "forge.analytics.model.v2";
const MAX_EVENTS = 5000;

const SKILLS: ForgeSkill[] = [
  "focus",
  "control",
  "patience",
  "persistence",
  "consistency",
];

const DIMENSION_DEFAULTS: ForgePerformanceVector = {
  accuracy: 0.5,
  reactionControl: 0.5,
  memoryLoad: 0.5,
  recovery: 0.5,
  consistency: 0.5,
  difficulty: 0.5,
  fatigue: 0,
  restQuality: 0.5,
};

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
    dimensions: { ...DIMENSION_DEFAULTS },
  };
}

function defaultModel(): ForgePlayerModel {
  return {
    version: 2,
    skills: Object.fromEntries(
      SKILLS.map((skill) => [skill, defaultSkill(skill)]),
    ) as Record<ForgeSkill, ForgeSkillState>,
    updatedAt: Date.now(),
    crossSkill: {},
  };
}

export function getPlayerModel(): ForgePlayerModel {
  if (typeof window === "undefined") return defaultModel();

  try {
    const raw = window.localStorage.getItem(MODEL_KEY);
    if (!raw) return defaultModel();
    const parsed = JSON.parse(raw) as ForgePlayerModel;
    if (parsed.version !== 2 || !parsed.skills) return defaultModel();
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
  ingestForgeEvent(next);
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

export function getSkillMastery(skill: ForgeSkill): number {
  return Math.round(getPlayerModel().skills[skill].rating * 100);
}

export function getCrossSkillInfluence(
  target: ForgeSkill,
  source: ForgeSkill,
): number {
  const model = getPlayerModel();
  const key = `${source}->${target}`;
  return model.crossSkill[key] ?? 0;
}

function calculateRating(
  current: ForgeSkillState,
  performance: number,
  dimensions: Partial<ForgePerformanceVector>,
) {
  const normalized = Math.max(0, Math.min(1, performance));
  const previous = current.dimensions;
  const nextDimensions: ForgePerformanceVector = {
    ...previous,
    ...dimensions,
  };

  // The rating is deliberately multidimensional rather than raw accuracy.
  const weighted =
    nextDimensions.accuracy * 0.20 +
    nextDimensions.reactionControl * 0.15 +
    nextDimensions.memoryLoad * 0.15 +
    nextDimensions.recovery * 0.10 +
    nextDimensions.consistency * 0.15 +
    nextDimensions.difficulty * 0.15 +
    nextDimensions.restQuality * 0.10 -
    nextDimensions.fatigue * 0.10;

  const blended = Math.max(0, Math.min(1, weighted * 0.75 + normalized * 0.25));
  const learningRate = Math.max(0.06, 0.24 / Math.sqrt(current.attempts + 1));

  return {
    rating:
      current.attempts === 0
        ? blended
        : current.rating + (blended - current.rating) * learningRate,
    dimensions: nextDimensions,
  };
}

export function updateSkillModel(
  skill: ForgeSkill,
  performance: number,
  difficulty: number,
  success: boolean,
  dimensions: Partial<ForgePerformanceVector> = {},
) {
  const model = getPlayerModel();
  const current = model.skills[skill];
  const normalized = Math.max(0, Math.min(1, performance));

  const result = calculateRating(current, normalized, {
    difficulty: Math.max(0, Math.min(1, difficulty / 10)),
    ...dimensions,
  });

  const recent = [...current.recentPerformance, normalized].slice(-12);

  model.skills[skill] = {
    ...current,
    rating: result.rating,
    confidence: Math.min(1, current.confidence + 0.06),
    attempts: current.attempts + 1,
    successes: current.successes + (success ? 1 : 0),
    recentPerformance: recent,
    lastPlayedAt: Date.now(),
    lastDifficulty: difficulty,
    dimensions: result.dimensions,
  };

  model.updatedAt = Date.now();
  savePlayerModel(model);
  return model.skills[skill];
}

export function applyCrossSkillTransfer(
  source: ForgeSkill,
  target: ForgeSkill,
  amount: number,
) {
  if (source === target) return;

  const model = getPlayerModel();
  const key = `${source}->${target}`;
  const current = model.crossSkill[key] ?? 0;
  model.crossSkill[key] = Math.max(-1, Math.min(1, current * 0.8 + amount * 0.2));

  const targetState = model.skills[target];
  const sourceState = model.skills[source];

  // Transfer is deliberately small: another skill can inform difficulty,
  // but it can never replace direct evidence from the target game.
  const influence = model.crossSkill[key];
  targetState.rating = Math.max(
    0,
    Math.min(1, targetState.rating + influence * 0.03 * targetState.confidence),
  );
  targetState.dimensions = {
    ...targetState.dimensions,
    consistency:
      targetState.dimensions.consistency * 0.95 +
      sourceState.rating * 0.05,
  };

  model.updatedAt = Date.now();
  savePlayerModel(model);
}

export function getHealthyUseSummary(): {
  improvementPerMinute: number;
  recoveryQuality: number;
  restPerformance: number;
  stoppingQuality: number;
  repeatedAttemptsWithoutImprovement: number;
} {
  const events = getAnalyticsEvents();
  const sessions = events.filter((event) => event.event === "session_completed");
  const recoveries = events.filter((event) => event.event === "recovery");
  const trials = events.filter((event) => event.event === "trial_completed");

  if (!sessions.length) {
    return {
      improvementPerMinute: 0,
      recoveryQuality: 0,
      restPerformance: 0,
      stoppingQuality: 0,
      repeatedAttemptsWithoutImprovement: 0,
    };
  }

  const recent = trials.slice(-30);
  const firstHalf = recent.slice(0, Math.max(1, Math.floor(recent.length / 2)));
  const secondHalf = recent.slice(Math.max(1, Math.floor(recent.length / 2)));
  const mean = (items: ForgeEvent[]) =>
    items.length
      ? items.reduce((sum, event) => {
          const value = Number(event.performance?.accuracy ?? event.payload?.score ?? 0);
          return sum + Math.max(0, Math.min(1, value));
        }, 0) / items.length
      : 0;

  const improvementPerMinute = Math.max(0, mean(secondHalf) - mean(firstHalf));
  const recoveryQuality = recoveries.length
    ? Math.max(0, Math.min(1, 1 - recoveries.length / Math.max(1, trials.length)))
    : 1;

  const restPerformance = (() => {
    const starts = events.filter((event) => event.event === "rest_started");
    const completed = events.filter((event) => event.event === "rest_completed");
    if (!starts.length || !completed.length) return 0.5;
    return Math.min(1, completed.length / starts.length);
  })();

  const stoppingQuality = sessions.length > 1
    ? Math.min(1, sessions.length / Math.max(1, sessions.length + recoveries.length))
    : 0.5;

  const repeatedAttemptsWithoutImprovement = recoveries.length
    ? Math.min(1, recoveries.length / Math.max(1, trials.length))
    : 0;

  return {
    improvementPerMinute,
    recoveryQuality,
    restPerformance,
    stoppingQuality,
    repeatedAttemptsWithoutImprovement,
  };
}
