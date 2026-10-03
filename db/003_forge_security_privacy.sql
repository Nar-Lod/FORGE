create table if not exists forge_rate_limits (
  subject text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0
);

create table if not exists forge_privacy_requests (
  id text primary key,
  account_id text not null references forge_accounts(id) on delete cascade,
  request_type text not null check (request_type in ('export','delete')),
  requested_at timestamptz not null default now(),
  completed_at timestamptz,
  status text not null default 'pending'
);

create index if not exists forge_privacy_requests_account on forge_privacy_requests(account_id, requested_at desc);

create table if not exists forge_admin_audit (
  id text primary key,
  admin_subject text not null,
  action text not null,
  target_account_id text,
  created_at timestamptz not null default now(),
  metadata jsonb
);

create index if not exists forge_admin_audit_time on forge_admin_audit(created_at desc);
