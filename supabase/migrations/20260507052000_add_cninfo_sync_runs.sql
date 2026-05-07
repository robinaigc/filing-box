create table if not exists public.cninfo_sync_runs (
  id bigint generated always as identity primary key,
  company_id text references public.companies(id) on delete set null,
  symbol text not null,
  org_id text,
  status text not null check (status in ('success', 'empty', 'failed')),
  synced_count integer not null default 0,
  error_message text,
  started_at timestamptz not null,
  finished_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists cninfo_sync_runs_symbol_finished_at_idx
  on public.cninfo_sync_runs (symbol, finished_at desc);

create index if not exists cninfo_sync_runs_status_finished_at_idx
  on public.cninfo_sync_runs (status, finished_at desc);

alter table public.cninfo_sync_runs enable row level security;

grant all on public.cninfo_sync_runs to service_role;
