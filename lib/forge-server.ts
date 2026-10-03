import { neon } from "@neondatabase/serverless";
import { randomUUID } from "node:crypto";

export type ForgeServerContext = {
  authSubject: string;
};

function database() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

export async function ensureAccount(context: ForgeServerContext) {
  const sql = database();
  const rows = await sql(
    `select id, auth_subject, benchmark_opt_in, country_code, age_bracket
     from forge_accounts where auth_subject = $1 limit 1`,
    [context.authSubject],
  );

  if (rows.length) return rows[0];

  const accountId = `acct_${randomUUID()}`;
  await sql(
    `insert into forge_accounts (id, auth_subject) values ($1, $2)`,
    [accountId, context.authSubject],
  );
  return (await sql(
    `select id, auth_subject, benchmark_opt_in, country_code, age_bracket
     from forge_accounts where id = $1`,
    [accountId],
  ))[0];
}

export async function ensurePlayer(accountId: string, anonymousInstallId?: string) {
  const sql = database();
  const existing = await sql(
    `select id from forge_players where account_id = $1 order by created_at asc limit 1`,
    [accountId],
  );
  if (existing.length) return existing[0].id;

  const playerId = `player_${randomUUID()}`;
  await sql(
    `insert into forge_players (id, account_id, anonymous_install_id)
     values ($1, $2, $3)`,
    [playerId, accountId, anonymousInstallId ?? null],
  );
  return playerId;
}

export async function ingestServerEvent(
  playerId: string,
  event: {
    id: string;
    sessionId: string;
    timestamp: number;
    skill: string;
    game: string;
    event: string;
    difficulty?: { level: number; score: number };
    performance?: Record<string, number | undefined>;
    payload?: Record<string, number | string | boolean | null>;
  },
) {
  const sql = database();

  // Idempotency: retries must never duplicate an event.
  const existing = await sql(
    `select id from forge_event_ledger where id = $1 limit 1`,
    [event.id],
  );
  if (existing.length) return { accepted: false, duplicate: true };

  await sql(
    `insert into forge_event_ledger
      (id, player_id, session_id, event_name, occurred_at, difficulty, performance, payload)
     values ($1,$2,$3,$4,to_timestamp($5 / 1000.0),$6::jsonb,$7::jsonb,$8::jsonb)`,
    [
      event.id,
      playerId,
      event.sessionId,
      event.event,
      event.timestamp,
      JSON.stringify(event.difficulty ?? null),
      JSON.stringify(event.performance ?? null),
      JSON.stringify(event.payload ?? null),
    ],
  );

  return { accepted: true, duplicate: false };
}

export async function getPlayerTrainingState(playerId: string) {
  const sql = database();

  const [skills, sessions, attempts, bests, healthy] = await Promise.all([
    sql(`select * from forge_skill_scores where player_id = $1 order by skill`, [playerId]),
    sql(`select * from forge_sessions where player_id = $1 order by started_at desc limit 100`, [playerId]),
    sql(`select * from forge_attempts where player_id = $1 order by completed_at desc limit 500`, [playerId]),
    sql(`select * from forge_personal_bests where player_id = $1 order by achieved_at desc`, [playerId]),
    sql(`select * from forge_healthy_use where player_id = $1 limit 1`, [playerId]),
  ]);

  return { skills, sessions, attempts, personalBests: bests, healthyUse: healthy[0] ?? null };
}

export async function recordDifficulty(
  playerId: string,
  skill: string,
  game: string,
  level: number,
  score: number,
  confidence: number,
) {
  const sql = database();
  await sql(
    `insert into forge_difficulty (id, player_id, skill, game, level, score, confidence)
     values ($1,$2,$3,$4,$5,$6,$7)`,
    [`diff_${randomUUID()}`, playerId, skill, game, level, score, confidence],
  );
}

export async function getAdaptiveState(playerId: string, skill: string) {
  const sql = database();
  const [skillRows, recent] = await Promise.all([
    sql(
      `select score, reliability, sample_size
       from forge_skill_scores where player_id = $1 and skill = $2 limit 1`,
      [playerId, skill],
    ),
    sql(
      `select performance, difficulty_level
       from forge_sessions
       where player_id = $1 and skill = $2 and performance is not null
       order by started_at desc limit 8`,
      [playerId, skill],
    ),
  ]);

  const state = skillRows[0];
  const rating = Number(state?.score ?? 0.5);
  const reliability = Number(state?.reliability ?? 0);
  const recentPerformance = recent.map((row) => Number(row.performance)).filter(Number.isFinite);
  const recentMean = recentPerformance.length
    ? recentPerformance.reduce((sum, value) => sum + value, 0) / recentPerformance.length
    : rating;

  // Bounds are game design constraints; the chosen level is data-driven.
  const pressure = (recentMean - 0.72) * 2.5;
  const confidence = Math.min(1, reliability + recentPerformance.length / 20);
  const level = Math.max(1, Math.min(10, Math.round(1 + rating * 9 + pressure * 2)));
  const targetPerformance = 0.72;

  return {
    level,
    rating,
    confidence,
    targetPerformance,
    recentMean,
    sampleSize: Number(state?.sample_size ?? 0),
  };
}
