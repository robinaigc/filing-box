import { writeFileSync } from "node:fs";
import { aliases } from "@/data/aliases";
import { companies } from "@/data/companies";
import { reports } from "@/data/reports";
import { normalizeQuery } from "@/lib/normalize";

function sql(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "null";
  }

  if (typeof value === "number") {
    return String(value);
  }

  return `'${value.replace(/'/g, "''")}'`;
}

const lines: string[] = [
  "-- Filing Box local seed data for Supabase.",
  "-- Generated from data/*.ts. Do not store PDF bodies in the database.",
  "",
  "begin;",
  "",
];

for (const company of companies) {
  lines.push(
    [
      "insert into public.companies",
      "(id, market, symbol, code, name, display_name, exchange)",
      "values",
      `(${sql(company.id)}, ${sql(company.market)}, ${sql(company.symbol)}, ${sql(company.code)}, ${sql(company.name)}, ${sql(company.displayName)}, ${sql(company.exchange)})`,
      "on conflict (id) do update set",
      "market = excluded.market,",
      "symbol = excluded.symbol,",
      "code = excluded.code,",
      "name = excluded.name,",
      "display_name = excluded.display_name,",
      "exchange = excluded.exchange;",
    ].join(" "),
  );
}

lines.push("");

const uniqueAliases = aliases.filter((alias, index, list) => {
  const normalized = normalizeQuery(alias.alias);
  return (
    list.findIndex(
      (item) => item.companyId === alias.companyId && normalizeQuery(item.alias) === normalized,
    ) === index
  );
});

for (const alias of uniqueAliases) {
  lines.push(
    [
      "insert into public.company_aliases",
      "(company_id, alias, language, alias_type, normalized_alias)",
      "values",
      `(${sql(alias.companyId)}, ${sql(alias.alias)}, ${sql(alias.language)}, ${sql(alias.aliasType)}, ${sql(normalizeQuery(alias.alias))})`,
      "on conflict (company_id, normalized_alias) do update set",
      "alias = excluded.alias,",
      "language = excluded.language,",
      "alias_type = excluded.alias_type;",
    ].join(" "),
  );
}

lines.push("");

for (const report of reports) {
  lines.push(
    [
      "insert into public.reports",
      "(id, company_id, market, symbol, company_name, exchange, report_type, title, year, period, filing_date, source, source_url, download_url)",
      "values",
      `(${sql(report.id)}, ${sql(report.companyId)}, ${sql(report.market)}, ${sql(report.symbol)}, ${sql(report.companyName)}, ${sql(report.exchange)}, ${sql(report.reportType)}, ${sql(report.title)}, ${sql(report.year)}, ${sql(report.period)}, ${sql(report.filingDate)}, ${sql(report.source)}, ${sql(report.sourceUrl || null)}, ${sql(report.downloadUrl || null)})`,
      "on conflict (id) do update set",
      "company_id = excluded.company_id,",
      "market = excluded.market,",
      "symbol = excluded.symbol,",
      "company_name = excluded.company_name,",
      "exchange = excluded.exchange,",
      "report_type = excluded.report_type,",
      "title = excluded.title,",
      "year = excluded.year,",
      "period = excluded.period,",
      "filing_date = excluded.filing_date,",
      "source = excluded.source,",
      "source_url = excluded.source_url,",
      "download_url = excluded.download_url;",
    ].join(" "),
  );
}

lines.push(
  "",
  "delete from public.recent_reports;",
  "",
  `insert into public.recent_reports (report_id, rank)
select id, row_number() over (order by filing_date desc) as rank
from (
  select distinct on (company_id) id, company_id, filing_date
  from public.reports
  order by company_id, filing_date desc
) latest_by_company
order by filing_date desc
limit 6;`,
  "",
  "commit;",
  "",
);

writeFileSync("supabase/seed.sql", lines.join("\n"), "utf8");
console.log(
  `Generated supabase/seed.sql with ${companies.length} companies, ${uniqueAliases.length} aliases, ${reports.length} reports.`,
);
