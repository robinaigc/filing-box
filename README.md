# Filing Box / 财报盒子

极简财报搜索下载工具。用户输入公司名、股票代码或中文别名后，页面直接展示该公司的官方财报列表，并提供官方来源和下载入口。

## Current Status

- Next.js + TypeScript + Tailwind CSS 单页应用
- Supabase PostgreSQL 数据源
- 美股 SEC EDGAR 数据已接入前 2000 家 SEC 公司池
- A 股巨潮资讯 CNINFO 数据已接入当前 seed 公司
- Vercel 生产环境已发布
- PDF 文件本体不存储在 Supabase，只保存官方来源链接和下载链接
- 美股采用热门预同步 + 长尾按需同步：搜索未缓存的美股公司时，服务端会从 SEC 拉取并缓存最新财报元数据

Production:

- https://filing-box.vercel.app

Repository:

- https://github.com/robinaigc/filing-box

当前已同步：

- 美股：已从 SEC `company_tickers_exchange.json` 导入前 2000 家公司，并缓存 21394 条 SEC 财报元数据
- A 股：`600519`、`300750`、`300059`、`002594`、`600036`

## Local Development

```bash
npm install
npm run dev
```

Open:

```txt
http://127.0.0.1:3000
```

## Environment Variables

Create `.env.local` from `.env.example`.

```env
NEXT_PUBLIC_DATA_SOURCE=supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=

SUPABASE_SERVICE_ROLE_KEY=
SEC_USER_AGENT=FilingBox your-email@example.com
```

Notes:

- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` is safe for browser use.
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must never be exposed in frontend code.
- `.env.local` is ignored by Git.

## Supabase

Schema migration:

```txt
supabase/migrations/20260506182500_initial_filing_box_schema.sql
supabase/migrations/20260507040500_add_sec_sync_runs.sql
```

Seed SQL:

```txt
supabase/seed.sql
```

The database stores metadata only:

- company records
- aliases
- report titles
- report type and period
- filing date
- source and download URLs

It does not store PDF binaries.

## Sync Scripts

Generate seed SQL:

```bash
npm run db:seed:generate
```

Sync SEC EDGAR filings:

```bash
npm run sync:sec:companies
npm run sync:sec:companies -- --limit=100
npm run sync:sec:companies -- --offset=100 --limit=400
npm run sync:sec:companies -- --dry-run --limit=10
npm run sync:sec
npm run sync:sec -- --limit=100
npm run sync:sec -- --offset=100 --limit=100
npm run sync:sec -- --symbol=AAPL
npm run sync:sec:status
npm run sync:sec:status -- --status=empty --limit=20
npm run sync:sec:coverage
npm run sync:sec:coverage -- --status=missing --limit=50
npm run sync:sec:coverage -- --status=empty --limit=50
```

`sync:sec` records per-company sync status in `public.sec_sync_runs` when the
`20260507040500_add_sec_sync_runs.sql` migration has been applied. If the table
is not present yet, sync still runs and prints a warning for status logging only.

`sync:sec:coverage` reports the latest per-company sync state, rather than raw
log row totals. It is the preferred tool for deciding which SEC batch to run next.

The frontend search path uses `/api/search`. If a matched US company has no
cached reports, the API performs a lightweight on-demand SEC sync for that one
company and returns the cached result.

Generate SEC sync SQL without writing to Supabase:

```bash
npm run sync:sec:sql
```

Sync CNINFO reports:

```bash
npm run sync:cninfo
npm run sync:cninfo -- --symbol=300059
```

Rebuild recent reports:

```bash
npm run db:recent:rebuild
```

## Validation

```bash
npm run typecheck
npm run test:acceptance
npm run build
```

## Deployment Notes

For Vercel:

1. Import this GitHub repository.
2. Set the public Supabase variables.
3. Do not set or expose `SUPABASE_SERVICE_ROLE_KEY` unless a server-only sync job needs it.
4. Keep scheduled SEC/CNINFO sync jobs server-side only.

Current production domain:

```txt
https://filing-box.vercel.app
```

Hashed deployment URLs may show Vercel Authentication depending on project protection settings. Use the production domain for public access.

## Scope

This is not a finance portal. It intentionally excludes news, quotes, K-lines, recommendations, analysis, login, subscriptions, and PDF storage.
