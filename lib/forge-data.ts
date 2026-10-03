export type ForgeScope = "global" | "country" | "age_bracket" | "friends" | "personal" | "weekly" | "monthly";

export type ForgeAttemptRecord = {
  id: string;
  sessionId: string;
  skill: string;
  game: string;
  startedAt: number;
  completedAt: number;
  outcome: string;
  performance: number;
  difficulty: number;
  score: number | null;
  assisted: boolean;
};

export type ForgeSessionRecord = {
  id: string;
  skill: string;
  game: string;
  startedAt: number;
  completedAt: number | null;
  durationMs: number;
  status: "active" | "completed" | "abandoned";
  score: number | null;
  performance: number | null;
  difficulty: number;
  attempts: number;
  recoveries: number;
  reveals: number;
  restStarted: boolean;
  restCompleted: boolean;
};

export type ForgePersonalBest = {
  skill: string;
  game: string;
  score: number;
  difficulty: number;
  achievedAt: number;
  sessionId: string;
};

export type ForgeImprovementPoint = {
  timestamp: number;
  skill: string;
  game: string;
  performance: number;
  difficulty: number;
  sessionDurationMs: number;
};

export type ForgeBreakRecord = {
  startedAt: number;
  completedAt: number | null;
  durationMs: number;
  quality: number;
};

export type ForgeHealthyUseRecord = {
  improvementPerMinute: number;
  recoveryQuality: number;
  restPerformance: number;
  stoppingQuality: number;
  repeatedAttemptsWithoutImprovement: number;
  deliberateBreakRate: number;
};

export type ForgeTrainingHistory = {
  sessions: ForgeSessionRecord[];
  attempts: ForgeAttemptRecord[];
  personalBests: ForgePersonalBest[];
  improvement: ForgeImprovementPoint[];
  breaks: ForgeBreakRecord[];
  updatedAt: number;
};

export type ForgePlayerRecord = {
  version: 1;
  playerId: string;
  createdAt: number;
  updatedAt: number;
  profile: {
    displayName?: string;
    profileVersion: number;
    consentVersion: string | null;
  };
  training: ForgeTrainingHistory;
  healthyUse: ForgeHealthyUseRecord;
};

const PLAYER_KEY = "forge.player.record.v1";
const ID_KEY = "forge.player.id.v1";

const emptyHealthyUse = (): ForgeHealthyUseRecord => ({
  improvementPerMinute: 0,
  recoveryQuality: 0,
  restPerformance: 0.5,
  stoppingQuality: 0,
  repeatedAttemptsWithoutImprovement: 0,
  deliberateBreakRate: 0,
});

function createPlayerId() {
  return `player_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

function emptyTraining(): ForgeTrainingHistory {
  return {
    sessions: [],
    attempts: [],
    personalBests: [],
    improvement: [],
    breaks: [],
    updatedAt: Date.now(),
  };
}

function createRecord(playerId = createPlayerId()): ForgePlayerRecord {
  const now = Date.now();
  return {
    version: 1,
    playerId,
    createdAt: now,
    updatedAt: now,
    profile: { profileVersion: 1, consentVersion: null },
    training: emptyTraining(),
    healthyUse: emptyHealthyUse(),
  };
}

export function getForgePlayerId(): string {
  if (typeof window === "undefined") return "server";
  const existing = window.localStorage.getItem(ID_KEY);
  if (existing) return existing;
  const id = createPlayerId();
  window.localStorage.setItem(ID_KEY, id);
  return id;
}

export function getForgePlayerRecord(): ForgePlayerRecord {
  if (typeof window === "undefined") return createRecord("server");

  try {
    const raw = window.localStorage.getItem(PLAYER_KEY);
    if (!raw) {
      const record = createRecord(getForgePlayerId());
      saveForgePlayerRecord(record);
      return record;
    }
    const parsed = JSON.parse(raw) as ForgePlayerRecord;
    if (parsed.version !== 1 || !parsed.training) throw new Error("invalid record");
    return parsed;
  } catch {
    return createRecord(getForgePlayerId());
  }
}

export function saveForgePlayerRecord(record: ForgePlayerRecord) {
  if (typeof window === "undefined") return;
  record.updatedAt = Date.now();
  record.training.updatedAt = record.updatedAt;
  window.localStorage.setItem(PLAYER_KEY, JSON.stringify(record));
}

export function updateForgePlayerProfile(
  profile: Partial<ForgePlayerRecord["profile"]>,
) {
  const record = getForgePlayerRecord();
  record.profile = { ...record.profile, ...profile };
  saveForgePlayerRecord(record);
  return record;
}

export function upsertForgeSession(session: ForgeSessionRecord) {
  const record = getForgePlayerRecord();
  const index = record.training.sessions.findIndex((item) => item.id === session.id);
  if (index >= 0) record.training.sessions[index] = session;
  else record.training.sessions.push(session);
  record.training.sessions = record.training.sessions.slice(-1000);
  saveForgePlayerRecord(record);
  return record;
}

export function appendForgeAttempt(attempt: ForgeAttemptRecord) {
  const record = getForgePlayerRecord();
  record.training.attempts.push(attempt);
  record.training.attempts = record.training.attempts.slice(-5000);

  const score = attempt.score;
  if (score !== null && Number.isFinite(score)) {
    const existing = record.training.personalBests.find(
      (item) => item.skill === attempt.skill && item.game === attempt.game,
    );
    if (!existing || score > existing.score) {
      const next: ForgePersonalBest = {
        skill: attempt.skill,
        game: attempt.game,
        score,
        difficulty: attempt.difficulty,
        achievedAt: attempt.completedAt,
        sessionId: attempt.sessionId,
      };
      if (existing) Object.assign(existing, next);
      else record.training.personalBests.push(next);
    }
  }

  record.training.improvement.push({
    timestamp: attempt.completedAt,
    skill: attempt.skill,
    game: attempt.game,
    performance: Math.max(0, Math.min(1, attempt.performance)),
    difficulty: Math.max(0, Math.min(1, attempt.difficulty / 10)),
    sessionDurationMs: Math.max(0, attempt.completedAt - attempt.startedAt),
  });
  record.training.improvement = record.training.improvement.slice(-2000);
  saveForgePlayerRecord(record);
  return record;
}

export function appendForgeBreak(breakRecord: ForgeBreakRecord) {
  const record = getForgePlayerRecord();
  record.training.breaks.push(breakRecord);
  record.training.breaks = record.training.breaks.slice(-1000);
  record.healthyUse = deriveHealthyUse(record.training);
  saveForgePlayerRecord(record);
  return record;
}

export function deriveHealthyUse(training: ForgeTrainingHistory): ForgeHealthyUseRecord {
  const points = training.improvement.slice(-60);
  const midpoint = Math.floor(points.length / 2);
  const first = points.slice(0, midpoint);
  const second = points.slice(midpoint);
  const mean = (items: ForgeImprovementPoint[]) =>
    items.length ? items.reduce((sum, item) => sum + item.performance, 0) / items.length : 0;
  const durationMinutes = training.sessions
    .slice(-30)
    .reduce((sum, session) => sum + session.durationMs, 0) / 60000;
  const improvement = Math.max(0, mean(second) - mean(first));

  const completedBreaks = training.breaks.filter((item) => item.completedAt !== null);
  const recoveryAttempts = training.attempts.filter((item) => item.outcome !== "hit" && item.outcome !== "success");
  const repeatedWithoutImprovement = recoveryAttempts.length
    ? Math.min(1, recoveryAttempts.length / Math.max(1, training.attempts.length))
    : 0;

  return {
    improvementPerMinute: durationMinutes > 0 ? improvement / durationMinutes : improvement,
    recoveryQuality: training.attempts.length
      ? Math.max(0, 1 - recoveryAttempts.length / training.attempts.length)
      : 0,
    restPerformance: completedBreaks.length
      ? Math.min(1, completedBreaks.length / Math.max(1, training.breaks.length))
      : 0.5,
    stoppingQuality: training.sessions.length
      ? Math.min(1, completedBreaks.length / Math.max(1, training.sessions.length))
      : 0,
    repeatedAttemptsWithoutImprovement: repeatedWithoutImprovement,
    deliberateBreakRate: training.sessions.length
      ? Math.min(1, completedBreaks.length / training.sessions.length)
      : 0,
  };
}

export function getPersonalBest(skill: string, game: string): ForgePersonalBest | null {
  return getForgePlayerRecord().training.personalBests.find(
    (item) => item.skill === skill && item.game === game,
  ) ?? null;
}

export function getTrainingHistory(): ForgeTrainingHistory {
  return getForgePlayerRecord().training;
}

export { PLAYER_KEY as FORGE_PLAYER_RECORD_KEY };
