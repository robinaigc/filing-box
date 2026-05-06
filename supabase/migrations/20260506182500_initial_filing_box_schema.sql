create table if not exists public.companies (
  id text primary key,
  market text not null check (market in ('US', 'CN')),
  symbol text not null,
  code text,
  name text not null,
  display_name text not null,
  exchange text not null,
  cik text,
  org_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint companies_symbol_market_unique unique (market, symbol)
);

create table if not exists public.company_aliases (
  id bigint generated always as identity primary key,
  company_id text not null references public.companies(id) on delete cascade,
  alias text not null,
  language text not null check (language in ('en', 'zh')),
  alias_type text not null check (
    alias_type in ('ticker', 'code', 'official_name', 'short_name', 'common_name')
  ),
  normalized_alias text not null,
  created_at timestamptz not null default now(),
  constraint company_aliases_company_normalized_unique unique (company_id, normalized_alias)
);

create table if not exists public.reports (
  id text primary key,
  company_id text not null references public.companies(id) on delete cascade,
  market text not null check (market in ('US', 'CN')),
  symbol text not null,
  company_name text not null,
  exchange text not null,
  report_type text not null,
  title text not null,
  year integer not null,
  period text not null check (period in ('FY', 'Q1', 'Q2', 'Q3', 'H1', 'OTHER')),
  filing_date date not null,
  source text not null check (source in ('SEC', 'CNINFO', 'MOCK')),
  view_url text,
  download_url text,
  source_url text,
  accession_number text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.search_logs (
  id bigint generated always as identity primary key,
  query text not null,
  normalized_query text,
  market text check (market in ('US', 'CN')),
  company_id text references public.companies(id) on delete set null,
  result_status text not null check (result_status in ('found', 'not_found', 'ambiguous')),
  result_count integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.recent_reports (
  id bigint generated always as identity primary key,
  report_id text not null references public.reports(id) on delete cascade,
  rank integer not null check (rank > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recent_reports_rank_unique unique (rank),
  constraint recent_reports_report_unique unique (report_id)
);

create index if not exists companies_symbol_idx on public.companies (symbol);
create index if not exists companies_code_idx on public.companies (code) where code is not null;
create index if not exists company_aliases_normalized_alias_idx
  on public.company_aliases (normalized_alias);
create index if not exists company_aliases_company_id_idx
  on public.company_aliases (company_id);
create index if not exists reports_company_filing_date_idx
  on public.reports (company_id, filing_date desc);
create index if not exists reports_market_report_type_year_idx
  on public.reports (market, report_type, year);
create index if not exists search_logs_created_at_idx
  on public.search_logs (created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists companies_set_updated_at on public.companies;
create trigger companies_set_updated_at
before update on public.companies
for each row execute function public.set_updated_at();

drop trigger if exists reports_set_updated_at on public.reports;
create trigger reports_set_updated_at
before update on public.reports
for each row execute function public.set_updated_at();

drop trigger if exists recent_reports_set_updated_at on public.recent_reports;
create trigger recent_reports_set_updated_at
before update on public.recent_reports
for each row execute function public.set_updated_at();

alter table public.companies enable row level security;
alter table public.company_aliases enable row level security;
alter table public.reports enable row level security;
alter table public.search_logs enable row level security;
alter table public.recent_reports enable row level security;

grant usage on schema public to anon, authenticated, service_role;
grant select on public.companies to anon, authenticated;
grant select on public.company_aliases to anon, authenticated;
grant select on public.reports to anon, authenticated;
grant select on public.recent_reports to anon, authenticated;
grant insert on public.search_logs to anon, authenticated;
grant all on public.companies to service_role;
grant all on public.company_aliases to service_role;
grant all on public.reports to service_role;
grant all on public.search_logs to service_role;
grant all on public.recent_reports to service_role;

drop policy if exists "Public read companies" on public.companies;
create policy "Public read companies"
on public.companies
for select
to anon, authenticated
using (true);

drop policy if exists "Public read company aliases" on public.company_aliases;
create policy "Public read company aliases"
on public.company_aliases
for select
to anon, authenticated
using (true);

drop policy if exists "Public read reports" on public.reports;
create policy "Public read reports"
on public.reports
for select
to anon, authenticated
using (true);

drop policy if exists "Public read recent reports" on public.recent_reports;
create policy "Public read recent reports"
on public.recent_reports
for select
to anon, authenticated
using (true);

drop policy if exists "Public insert search logs" on public.search_logs;
create policy "Public insert search logs"
on public.search_logs
for insert
to anon, authenticated
with check (true);
