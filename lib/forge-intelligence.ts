import type { ForgeEvent, ForgePerformanceVector, ForgeSkill } from "./forge-analytics";

export type ForgeSkillScore = {
  score: number;
  reliability: number;
  sampleSize: number;
  difficultyAdjustedScore: number;
  experienceAdjustedScore: number;
};

const clamp = (v: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));

export function calculateServerSkillScore(
  skill: ForgeSkill,
  sessions: Array<{
    performance: number | null;
    difficulty_level: number;
    duration_ms: number;
    status: string;
  }>,
): ForgeSkillScore {
  const completed = sessions.filter(s => s.status === "completed" && Number.isFinite(Number(s.performance)));
  if (!completed.length) return {
    score: 0.5, reliability: 0, sampleSize: 0,
    difficultyAdjustedScore: 0.5, experienceAdjustedScore: 0.5,
  };

  const recent = completed.slice(0, 40);
  const weighted = recent.reduce((sum, s, i) => {
    const recency = 1 / (1 + i * 0.08);
    const difficulty = clamp(Number(s.difficulty_level) / 10);
    const raw = clamp(Number(s.performance));
    return sum + (raw * 0.72 + difficulty * 0.28) * recency;
  }, 0);
  const weight = recent.reduce((sum, _, i) => sum + 1 / (1 + i * 0.08), 0);
  const difficultyAdjustedScore = clamp(weight ? weighted / weight : 0.5);
  const experienceFactor = 1 - Math.exp(-completed.length / 12);
  const experienceAdjustedScore = clamp(
    0.5 + (difficultyAdjustedScore - 0.5) * (0.55 + 0.45 * experienceFactor),
  );
  const variance = recent.reduce((sum, s) => {
    const d = clamp(Number(s.performance)) - difficultyAdjustedScore;
    return sum + d * d;
  }, 0) / recent.length;
  const stability = clamp(1 - Math.sqrt(variance) * 2.5);
  const reliability = clamp(0.15 + 0.7 * experienceFactor + 0.15 * stability);

  return {
    score: experienceAdjustedScore,
    reliability,
    sampleSize: completed.length,
    difficultyAdjustedScore,
    experienceAdjustedScore,
  };
}

export function eventPerformance(event: ForgeEvent): number {
  const p = event.performance ?? {};
  const values = [
    p.accuracy,
    p.reactionControl,
    p.memoryLoad,
    p.recovery,
    p.consistency,
    p.difficulty,
    p.restQuality,
  ].filter((v): v is number => Number.isFinite(v));
  return clamp(values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0.5);
}

export function deriveHealthyUse(
  sessions: Array<{ performance: number | null; duration_ms: number; status: string }>,
  breaks: Array<{ duration_ms: number; quality: number; completed_at: string | null }>,
  attempts: Array<{ performance: number; outcome: string }>,
) {
  const completed = sessions.filter(s => s.status === "completed");
  const recent = completed.slice(0, 60);
  const midpoint = Math.floor(recent.length / 2);
  const first = recent.slice(midpoint);
  const second = recent.slice(0, midpoint);
  const mean = (xs: typeof recent) =>
    xs.length ? xs.reduce((a, s) => a + Number(s.performance ?? 0), 0) / xs.length : 0;
  const durationMinutes = completed.slice(0, 30).reduce((a, s) => a + Number(s.duration_ms || 0), 0) / 60000;
  const improvement = Math.max(0, mean(second) - mean(first));
  const recoveryAttempts = attempts.filter(a => !["success", "hit"].includes(a.outcome)).length;
  const completedBreaks = breaks.filter(b => b.completed_at);
  const breakQuality = completedBreaks.length
    ? completedBreaks.reduce((a, b) => a + clamp(Number(b.quality)), 0) / completedBreaks.length
    : 0;
  return {
    improvementPerMinute: durationMinutes > 0 ? improvement / durationMinutes : improvement,
    recoveryQuality: attempts.length ? clamp(1 - recoveryAttempts / attempts.length) : 0,
    restPerformance: breakQuality || 0.5,
    stoppingQuality: completed.length ? clamp(completedBreaks.length / completed.length) : 0,
    repeatedAttemptsWithoutImprovement: attempts.length ? clamp(recoveryAttempts / attempts.length) : 0,
    deliberateBreakRate: completed.length ? clamp(completedBreaks.length / completed.length) : 0,
  };
}

export function recommendAdaptiveLevel(
  score: ForgeSkillScore,
  recentPerformance: number[],
  bounds: { min: number; max: number; target?: number },
) {
  const target = bounds.target ?? 0.72;
  const recent = recentPerformance.slice(0, 8);
  const mean = recent.length
    ? recent.reduce((a, b) => a + clamp(b), 0) / recent.length
    : score.score;
  const pressure = (mean - target) * 3.2;
  const confidence = clamp(score.reliability * 0.75 + Math.min(0.25, score.sampleSize / 40));
  const raw = 1 + score.score * Math.max(1, bounds.max - 1) + pressure * confidence * Math.max(1, bounds.max - 1);
  return {
    level: Math.round(Math.max(bounds.min, Math.min(bounds.max, raw))),
    confidence,
    targetPerformance: target,
    recentMean: mean,
  };
}
