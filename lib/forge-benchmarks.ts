import type { ForgeTrainingHistory } from "./forge-data";

export type ForgeBenchmarkScope =
  | "global"
  | "country"
  | "age_bracket"
  | "friends"
  | "weekly"
  | "monthly";

export type ForgeSkillScore = {
  skill: string;
  score: number;
  difficultyAdjustedScore: number;
  experienceAdjustedScore: number;
  reliability: number;
  sampleSize: number;
  asOf: number;
};

export type ForgeBenchmarkSnapshot = {
  version: 1;
  scope: ForgeBenchmarkScope;
  skill: string;
  metric: "skill_score";
  sampleCount: number;
  minSampleSize: number;
  quantiles: Array<{ percentile: number; score: number }>;
  generatedAt: number;
};

export type ForgePercentileResult = {
  available: true;
  percentile: number;
  scope: ForgeBenchmarkScope;
  sampleCount: number;
  score: number;
  generatedAt: number;
} | {
  available: false;
  reason: "insufficient_population" | "insufficient_player_history" | "stale_benchmark";
  scope: ForgeBenchmarkScope;
  sampleCount: number;
  requiredSampleSize: number;
};

const DEFAULT_MIN_POPULATION = 1000;
const DEFAULT_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 8;

function clamp(value: number) {
  return Math.max(0, Math.min(1, value));
}

function weightedMean(values: Array<{ value: number; weight: number }>) {
  const usable = values.filter((item) => item.weight > 0 && Number.isFinite(item.value));
  if (!usable.length) return 0;
  const totalWeight = usable.reduce((sum, item) => sum + item.weight, 0);
  return usable.reduce((sum, item) => sum + item.value * item.weight, 0) / totalWeight;
}

function difficultyAdjustment(difficulty: number) {
  // Difficulty contributes, but never allows a low-quality result to become elite.
  return 0.65 + 0.35 * clamp(difficulty / 10);
}

function experienceAdjustment(sampleSize: number) {
  // Early scores are shrunk toward the population midpoint until enough evidence exists.
  const reliability = 1 - Math.exp(-sampleSize / 8);
  return { reliability, midpointWeight: 1 - reliability };
}

export function calculateSkillScore(
  skill: string,
  history: ForgeTrainingHistory,
): ForgeSkillScore {
  const sessions = history.sessions
    .filter((session) => session.skill === skill && session.performance !== null)
    .slice(-40);

  if (!sessions.length) {
    return {
      skill,
      score: 0,
      difficultyAdjustedScore: 0,
      experienceAdjustedScore: 0,
      reliability: 0,
      sampleSize: 0,
      asOf: Date.now(),
    };
  }

  const difficultyAdjusted = sessions.map((session) => ({
    value: clamp((session.performance ?? 0) * difficultyAdjustment(session.difficulty)),
    weight: Math.max(1, Math.min(5, session.difficulty)),
  }));

  const difficultyAdjustedScore = weightedMean(difficultyAdjusted);
  const { reliability, midpointWeight } = experienceAdjustment(sessions.length);
  const experienceAdjustedScore =
    difficultyAdjustedScore * reliability + 0.5 * midpointWeight;

  // Reliability is deliberately separate from the skill score.
  // It prevents a single lucky session from looking like a stable estimate.
  const consistencyValues = sessions.map((session) => session.performance ?? 0);
  const mean = consistencyValues.reduce((sum, value) => sum + value, 0) / consistencyValues.length;
  const variance = consistencyValues.reduce(
    (sum, value) => sum + Math.pow(value - mean, 2),
    0,
  ) / consistencyValues.length;
  const stability = 1 - Math.min(1, Math.sqrt(variance) * 2);
  const finalReliability = clamp(reliability * 0.7 + stability * 0.3);

  return {
    skill,
    score: Math.round(experienceAdjustedScore * 1000) / 1000,
    difficultyAdjustedScore,
    experienceAdjustedScore,
    reliability: finalReliability,
    sampleSize: sessions.length,
    asOf: sessions[sessions.length - 1].completedAt ?? Date.now(),
  };
}

function interpolateQuantile(
  quantiles: Array<{ percentile: number; score: number }>,
  score: number,
) {
  const sorted = [...quantiles].sort((a, b) => a.score - b.score);
  if (!sorted.length) return 50;
  if (score <= sorted[0].score) return sorted[0].percentile;
  if (score >= sorted[sorted.length - 1].score) return sorted[sorted.length - 1].percentile;

  for (let index = 1; index < sorted.length; index += 1) {
    const low = sorted[index - 1];
    const high = sorted[index];
    if (score <= high.score) {
      const span = Math.max(0.000001, high.score - low.score);
      const ratio = (score - low.score) / span;
      return low.percentile + (high.percentile - low.percentile) * ratio;
    }
  }

  return 50;
}

export function getPercentile(
  skillScore: ForgeSkillScore,
  benchmark: ForgeBenchmarkSnapshot | null,
  options: {
    scope: ForgeBenchmarkScope;
    now?: number;
    maxAgeMs?: number;
  },
): ForgePercentileResult {
  const now = options.now ?? Date.now();
  const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;

  if (skillScore.sampleSize < 3) {
    return {
      available: false,
      reason: "insufficient_player_history",
      scope: options.scope,
      sampleCount: skillScore.sampleSize,
      requiredSampleSize: 3,
    };
  }

  if (
    !benchmark ||
    benchmark.sampleCount < Math.max(DEFAULT_MIN_POPULATION, benchmark.minSampleSize)
  ) {
    return {
      available: false,
      reason: "insufficient_population",
      scope: options.scope,
      sampleCount: benchmark?.sampleCount ?? 0,
      requiredSampleSize: Math.max(DEFAULT_MIN_POPULATION, benchmark?.minSampleSize ?? DEFAULT_MIN_POPULATION),
    };
  }

  if (now - benchmark.generatedAt > maxAgeMs) {
    return {
      available: false,
      reason: "stale_benchmark",
      scope: options.scope,
      sampleCount: benchmark.sampleCount,
      requiredSampleSize: Math.max(DEFAULT_MIN_POPULATION, benchmark.minSampleSize),
    };
  }

  return {
    available: true,
    percentile: Math.round(interpolateQuantile(benchmark.quantiles, skillScore.score) * 10) / 10,
    scope: options.scope,
    sampleCount: benchmark.sampleCount,
    score: skillScore.score,
    generatedAt: benchmark.generatedAt,
  };
}

export function buildBenchmarkSnapshot(
  scope: ForgeBenchmarkScope,
  skill: string,
  scores: number[],
  generatedAt = Date.now(),
  minSampleSize = DEFAULT_MIN_POPULATION,
): ForgeBenchmarkSnapshot | null {
  const valid = scores.filter((score) => Number.isFinite(score)).map(clamp);
  if (valid.length < minSampleSize) return null;

  valid.sort((a, b) => a - b);
  const percentiles = [1, 5, 10, 25, 50, 75, 90, 95, 99];
  const quantiles = percentiles.map((percentile) => {
    const position = (percentile / 100) * (valid.length - 1);
    const lower = Math.floor(position);
    const upper = Math.ceil(position);
    const ratio = position - lower;
    const score = valid[lower] + (valid[upper] - valid[lower]) * ratio;
    return { percentile, score };
  });

  return {
    version: 1,
    scope,
    skill,
    metric: "skill_score",
    sampleCount: valid.length,
    minSampleSize,
    quantiles,
    generatedAt,
  };
}

export function explainBenchmarkState(
  result: ForgePercentileResult,
): string {
  if (result.available) {
    return `Benchmark available for ${result.scope}; population n=${result.sampleCount}.`;
  }

  if (result.reason === "insufficient_player_history") {
    return "Keep training: FORGE needs several comparable sessions before presenting a population comparison.";
  }

  if (result.reason === "stale_benchmark") {
    return "Population benchmark is temporarily unavailable because the reference distribution needs refreshing.";
  }

  return "Population benchmark is not available yet. FORGE will never manufacture a percentile.";
}
