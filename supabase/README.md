# Supabase schema notes

This directory contains the phase-two database schema draft for Filing Box.

Current migration:

- `migrations/20260506182500_initial_filing_box_schema.sql`

Current Supabase project:

- Name: `filing-box`
- Project ID / ref: `ypzuxlhjkivthfylemhs`
- Region: `ap-northeast-1`
- Status at creation: `ACTIVE_HEALTHY`

Tables:

- `companies`
- `company_aliases`
- `reports`
- `search_logs`
- `recent_reports`

ID strategy:

- Company and report primary keys are stable text IDs matching the current local seed data.
- Alias, search log, and recent report rows use generated identity IDs.
- This keeps phase-one local data and phase-two seed SQL import compatible.

Security model:

- Public read access is allowed for company, alias, report, and recent report metadata.
- Public insert access is allowed only for `search_logs`.
- Row level security is enabled on every public table.
- Explicit grants are included because new Supabase projects may not expose new public tables to the Data API automatically.

Apply later with Supabase CLI or Dashboard SQL editor, then verify:

```sql
select count(*) from public.companies;
select count(*) from public.company_aliases;
select count(*) from public.reports;
select count(*) from public.recent_reports;
```

Do not store PDF file bodies in the database. Store only official source and download URLs.

SEC sync status:

- US seed companies have CIK values in Supabase.
- All US seed companies have been synced against the official SEC submissions API.
- US mock SEC-like reports were removed from Supabase after real SEC filings were imported.
- A-share seed companies have been synced against CNINFO.
- A-share mock reports were removed from Supabase after real CNINFO reports were imported.
- SEC requests use `SEC_USER_AGENT`, currently intended as `FilingBox robin990083@gmail.com`.

CNINFO sync status:

- Current A-share seed companies synced: `600519`, `300750`, `300059`, `002594`, `600036`.
- CNINFO sync uses exact `symbol,org_id` stock parameters to avoid keyword false positives.
- CNINFO PDF URLs are stored in both `source_url` and `download_url`.
