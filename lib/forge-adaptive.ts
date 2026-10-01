import {
  getPlayerModel,
  type ForgeDifficulty,
  type ForgeSkill,
} from "./forge-analytics";

export type AdaptiveBand = {
  level: number;
  minPerformance: number;
  maxPerformance: number;
};

export type AdaptiveConfig = {
  minLevel: number;
  maxLevel: number;
  startingLevel: number;
  bands: AdaptiveBand[];
  upThreshold: number;
  downThreshold: number;
  consecutiveUp: number;
  consecutiveDown: number;
};

export type AdaptiveDecision = {
  level: number;
  direction: "up" | "down" | "hold";
  reason: "first_run" | "mastered" | "struggling" | "stable";
  targetPerformance: number;
};

export type AdaptiveState = {
  level: number;
  upStreak: number;
  downStreak: number;
  history: number[];
};



export const FORGE_ADAPTIVE_PROFILES: Record<ForgeSkill, AdaptiveConfig> = {
  focus: {
    minLevel: 1,
    maxLevel: 5,
    startingLevel: 1,
    bands: [
      { level: 1, minPerformance: 0, maxPerformance: 1 },
      { level: 2, minPerformance: 0, maxPerformance: 1 },
      { level: 3, minPerformance: 0, maxPerformance: 1 },
      { level: 4, minPerformance: 0, maxPerformance: 1 },
      { level: 5, minPerformance: 0, maxPerformance: 1 },
    ],
    upThreshold: 0.85,
    downThreshold: 0.65,
    consecutiveUp: 3,
    consecutiveDown: 2,
  },
  control: {
    minLevel: 1,
    maxLevel: 4,
    startingLevel: 1,
    bands: [1, 2, 3, 4].map((level) => ({ level, minPerformance: 0, maxPerformance: 1 })),
    upThreshold: 0.85,
    downThreshold: 0.6,
    consecutiveUp: 2,
    consecutiveDown: 2,
  },
  patience: {
    minLevel: 1,
    maxLevel: 10,
    startingLevel: 1,
    bands: Array.from({ length: 10 }, (_, index) => ({
      level: index + 1,
      minPerformance: 0,
      maxPerformance: 1,
    })),
    upThreshold: 0.8,
    downThreshold: 0.5,
    consecutiveUp: 1,
    consecutiveDown: 2,
  },
  persistence: {
    minLevel: 1,
    maxLevel: 10,
    startingLevel: 1,
    bands: Array.from({ length: 10 }, (_, index) => ({
      level: index + 1,
      minPerformance: 0,
      maxPerformance: 1,
    })),
    upThreshold: 0.9,
    downThreshold: 0.55,
    consecutiveUp: 1,
    consecutiveDown: 2,
  },
  consistency: {
    minLevel: 1,
    maxLevel: 7,
    startingLevel: 1,
    bands: Array.from({ length: 7 }, (_, index) => ({
      level: index + 1,
      minPerformance: 0,
      maxPerformance: 1,
    })),
    upThreshold: 0.9,
    downThreshold: 0.55,
    consecutiveUp: 1,
    consecutiveDown: 2,
  },
};

export function getAdaptiveProfile(skill: ForgeSkill): AdaptiveConfig {
  return FORGE_ADAPTIVE_PROFILES[skill];
}

export function clampDifficulty(level: number, config: AdaptiveConfig) {
  return Math.max(config.minLevel, Math.min(config.maxLevel, level));
}

export function chooseInitialDifficulty(
  skill: ForgeSkill,
  config: AdaptiveConfig,
): number {
  const model = getPlayerModel();
  const state = model.skills[skill];

  if (state.attempts === 0) return config.startingLevel;

  const rating = state.rating;
  const confidence = state.confidence;

  if (confidence < 0.35) return config.startingLevel;

  const span = config.maxLevel - config.minLevel;
  const estimated = config.minLevel + Math.round(rating * span * 0.7);
  return clampDifficulty(estimated, config);
}

export function updateAdaptiveState(
  state: AdaptiveState,
  performance: number,
  config: AdaptiveConfig,
): { state: AdaptiveState; decision: AdaptiveDecision } {
  const normalized = Math.max(0, Math.min(1, performance));
  const history = [...state.history, normalized].slice(-8);

  const recent = history.slice(-3);
  const average = recent.reduce((sum, value) => sum + value, 0) / Math.max(1, recent.length);

  let upStreak = state.upStreak;
  let downStreak = state.downStreak;
  let direction: AdaptiveDecision["direction"] = "hold";
  let reason: AdaptiveDecision["reason"] = "stable";
  let level = state.level;

  if (average >= config.upThreshold) {
    upStreak += 1;
    downStreak = 0;
  } else if (average <= config.downThreshold) {
    downStreak += 1;
    upStreak = 0;
  } else {
    upStreak = 0;
    downStreak = 0;
  }

  if (upStreak >= config.consecutiveUp && level < config.maxLevel) {
    level += 1;
    direction = "up";
    reason = "mastered";
    upStreak = 0;
  } else if (downStreak >= config.consecutiveDown && level > config.minLevel) {
    level -= 1;
    direction = "down";
    reason = "struggling";
    downStreak = 0;
  }

  return {
    state: { level, upStreak, downStreak, history },
    decision: {
      level,
      direction,
      reason,
      targetPerformance: average,
    },
  };
}

export function difficultySnapshot(
  level: number,
  confidence = 0.5,
): ForgeDifficulty {
  return {
    level,
    score: Math.max(0, Math.min(1, level / 10)),
    confidence,
  };
}

export function performanceFromAccuracy(
  accuracy: number,
  difficulty: number,
  maxDifficulty: number,
) {
  const normalizedAccuracy = Math.max(0, Math.min(1, accuracy));
  const difficultyWeight = 0.65 + 0.35 * (difficulty / Math.max(1, maxDifficulty));
  return Math.max(0, Math.min(1, normalizedAccuracy * difficultyWeight));
}
