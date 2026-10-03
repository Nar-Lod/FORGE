-- FORGE intelligence schema v1
-- Apply with a privileged migration runner. Never expose DATABASE_URL to clients.

create table if not exists forge_accounts (
  id text primary key,
  auth_subject text not null unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  consent_version text,
  country_code text,
  age_bracket text,
  benchmark_opt_in boolean not null default false
);

create table if not exists forge_players (
  id text primary key,
  account_id text not null references forge_accounts(id) on delete cascade,
  anonymous_install_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  profile_version integer not null default 1
);

create table if not exists forge_sessions (
  id text primary key,
  player_id text not null references forge_players(id) on delete cascade,
  skill text not null,
  game text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  duration_ms bigint not null default 0,
  status text not null check (status in ('active','completed','abandoned')),
  score numeric,
  performance numeric,
  difficulty_level integer not null,
  attempts integer not null default 0,
  recoveries integer not null default 0,
  reveals integer not null default 0,
  rest_started boolean not null default false,
  rest_completed boolean not null default false
);

create index if not exists forge_sessions_player_time on forge_sessions(player_id, started_at desc);
create index if not exists forge_sessions_skill_time on forge_sessions(player_id, skill, started_at desc);

create table if not exists forge_attempts (
  id text primary key,
  session_id text not null references forge_sessions(id) on delete cascade,
  player_id text not null references forge_players(id) on delete cascade,
  skill text not null,
  game text not null,
  started_at timestamptz not null,
  completed_at timestamptz not null,
  outcome text not null,
  performance numeric not null,
  difficulty_level integer not null,
  score numeric,
  assisted boolean not null default false
);

create index if not exists forge_attempts_player_time on forge_attempts(player_id, completed_at desc);

create table if not exists forge_skill_scores (
  player_id text not null references forge_players(id) on delete cascade,
  skill text not null,
  score numeric not null,
  reliability numeric not null,
  sample_size integer not null,
  difficulty_adjusted_score numeric not null,
  experience_adjusted_score numeric not null,
  updated_at timestamptz not null default now(),
  primary key (player_id, skill)
);

create table if not exists forge_difficulty (
  id text primary key,
  player_id text not null references forge_players(id) on delete cascade,
  skill text not null,
  game text not null,
  level integer not null,
  score numeric not null,
  confidence numeric not null,
  created_at timestamptz not null default now()
);

create index if not exists forge_difficulty_player_skill on forge_difficulty(player_id, skill, created_at desc);

create table if not exists forge_personal_bests (
  player_id text not null references forge_players(id) on delete cascade,
  skill text not null,
  game text not null,
  score numeric not null,
  difficulty_level integer not null,
  session_id text not null references forge_sessions(id) on delete cascade,
  achieved_at timestamptz not null,
  primary key (player_id, skill, game)
);

create table if not exists forge_improvement (
  id text primary key,
  player_id text not null references forge_players(id) on delete cascade,
  skill text not null,
  game text not null,
  performance numeric not null,
  difficulty_level integer not null,
  session_duration_ms bigint not null,
  created_at timestamptz not null
);

create index if not exists forge_improvement_player_time on forge_improvement(player_id, created_at desc);

create table if not exists forge_breaks (
  id text primary key,
  player_id text not null references forge_players(id) on delete cascade,
  started_at timestamptz not null,
  completed_at timestamptz,
  duration_ms bigint not null default 0,
  quality numeric not null default 0
);

create table if not exists forge_healthy_use (
  player_id text primary key references forge_players(id) on delete cascade,
  improvement_per_minute numeric not null default 0,
  recovery_quality numeric not null default 0,
  rest_performance numeric not null default 0.5,
  stopping_quality numeric not null default 0,
  repeated_attempts_without_improvement numeric not null default 0,
  deliberate_break_rate numeric not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists forge_event_ledger (
  id text primary key,
  player_id text not null references forge_players(id) on delete cascade,
  session_id text not null,
  event_name text not null,
  occurred_at timestamptz not null,
  difficulty jsonb,
  performance jsonb,
  payload jsonb,
  schema_version integer not null default 2
);

create index if not exists forge_events_player_time on forge_event_ledger(player_id, occurred_at desc);

create table if not exists forge_benchmark_snapshots (
  id text primary key,
  scope text not null,
  cohort_key text not null,
  skill text not null,
  metric text not null,
  sample_count integer not null,
  min_sample_size integer not null,
  quantiles jsonb not null,
  generated_at timestamptz not null,
  expires_at timestamptz not null
);

create unique index if not exists forge_benchmark_unique
  on forge_benchmark_snapshots(scope, cohort_key, skill, metric);

-- Raw event ledger and identity records are server-private.
-- Benchmark queries should use aggregated snapshots only.
