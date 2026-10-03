-- Performance and retention hardening for production PostgreSQL.
create index if not exists forge_events_session_time
  on forge_event_ledger(session_id, occurred_at);
create index if not exists forge_attempts_skill_game_time
  on forge_attempts(player_id, skill, game, completed_at desc);
create index if not exists forge_breaks_player_time
  on forge_breaks(player_id, started_at desc);
create index if not exists forge_benchmark_expiry
  on forge_benchmark_snapshots(expires_at);

alter table forge_accounts
  add constraint forge_accounts_country_code_check
  check (country_code is null or country_code ~ '^[A-Z]{2}$');

alter table forge_accounts
  add constraint forge_accounts_age_bracket_check
  check (age_bracket is null or age_bracket in ('13_15','16_17','18_24','25_34','35_44','45_54','55_plus'));

alter table forge_skill_scores
  add constraint forge_skill_scores_bounds
  check (score between 0 and 1 and reliability between 0 and 1);

alter table forge_healthy_use
  add constraint forge_healthy_use_bounds
  check (
    improvement_per_minute >= 0 and recovery_quality between 0 and 1 and
    rest_performance between 0 and 1 and stopping_quality between 0 and 1 and
    repeated_attempts_without_improvement between 0 and 1 and deliberate_break_rate between 0 and 1
  );
