import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;

  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    process.env[key] ??= value;
  }
}

loadLocalEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const statusArg = process.argv.find((arg) => arg.startsWith("--status="))?.split("=")[1];
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
const limit = limitArg ? Number(limitArg) : 50;

const allowedStatuses = [
  "success",
  "empty",
  "failed",
  "missing",
  "with_reports",
  "without_reports",
] as const;
type CoverageStatus = (typeof allowedStatuses)[number];

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

if (statusArg && !allowedStatuses.includes(statusArg as CoverageStatus)) {
  throw new Error(
    "--status must be one of success, empty, failed, missing, with_reports, without_reports.",
  );
}

if (!Number.isInteger(limit) || limit <= 0) {
  throw new Error("--limit must be a positive integer.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type CompanyRow = {
  id: string;
  symbol: string;
  display_name: string;
  exchange: string;
  org_id: string | null;
};

type ReportRow = {
  company_id: string;
};

type SyncRunRow = {
  symbol: string;
  status: "success" | "empty" | "failed";
  synced_count: number;
  error_message: string | null;
  finished_at: string;
};

type CoverageRow = {
  symbol: string;
  name: string;
  exchange: string;
  orgId: string | null;
  latestStatus: SyncRunRow["status"] | "missing";
  latestSyncedCount: number;
  reportCount: number;
  finishedAt: string | null;
  error: string;
};

async function fetchAllCompanies(): Promise<CompanyRow[]> {
  const rows: CompanyRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("companies")
      .select("id, symbol, display_name, exchange, org_id")
      .eq("market", "CN")
      .order("symbol", { ascending: true })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const page = (data ?? []) as CompanyRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

async function fetchAllReports(): Promise<ReportRow[]> {
  const rows: ReportRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("reports")
      .select("company_id")
      .eq("source", "CNINFO")
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const page = (data ?? []) as ReportRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

async function fetchAllSyncRuns(): Promise<SyncRunRow[]> {
  const rows: SyncRunRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("cninfo_sync_runs")
      .select("symbol, status, synced_count, error_message, finished_at")
      .order("finished_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    const page = (data ?? []) as SyncRunRow[];
    rows.push(...page);
    if (page.length < pageSize) break;
  }

  return rows;
}

function buildCoverage(
  companies: CompanyRow[],
  reports: ReportRow[],
  syncRuns: SyncRunRow[],
): CoverageRow[] {
  const reportCounts = new Map<string, number>();
  for (const report of reports) {
    reportCounts.set(report.company_id, (reportCounts.get(report.company_id) ?? 0) + 1);
  }

  const latestBySymbol = new Map<string, SyncRunRow>();
  for (const run of syncRuns) {
    if (!latestBySymbol.has(run.symbol)) {
      latestBySymbol.set(run.symbol, run);
    }
  }

  return companies.map((company) => {
    const latest = latestBySymbol.get(company.symbol);
    return {
      symbol: company.symbol,
      name: company.display_name,
      exchange: company.exchange,
      orgId: company.org_id,
      latestStatus: latest?.status ?? "missing",
      latestSyncedCount: latest?.synced_count ?? 0,
      reportCount: reportCounts.get(company.id) ?? 0,
      finishedAt: latest?.finished_at ?? null,
      error: latest?.error_message ?? "",
    };
  });
}

function printSummary(rows: CoverageRow[], cninfoReportCount: number) {
  const total = rows.length;
  const success = rows.filter((row) => row.latestStatus === "success").length;
  const empty = rows.filter((row) => row.latestStatus === "empty").length;
  const failed = rows.filter((row) => row.latestStatus === "failed").length;
  const missing = rows.filter((row) => row.latestStatus === "missing").length;
  const withReports = rows.filter((row) => row.reportCount > 0).length;
  const withOrgId = rows.filter((row) => row.orgId).length;

  console.log(
    JSON.stringify(
      {
        companies: {
          total,
          withOrgId,
          withoutOrgId: total - withOrgId,
          latestSuccess: success,
          latestEmpty: empty,
          latestFailed: failed,
          missingSyncStatus: missing,
          withReports,
          withoutReports: total - withReports,
        },
        reports: {
          cninfoReports: cninfoReportCount,
        },
      },
      null,
      2,
    ),
  );
}

function filterRows(rows: CoverageRow[]): CoverageRow[] {
  if (!statusArg) return rows;
  if (statusArg === "with_reports") return rows.filter((row) => row.reportCount > 0);
  if (statusArg === "without_reports") return rows.filter((row) => row.reportCount === 0);
  return rows.filter((row) => row.latestStatus === statusArg);
}

async function main() {
  const [companies, reports, syncRuns] = await Promise.all([
    fetchAllCompanies(),
    fetchAllReports(),
    fetchAllSyncRuns(),
  ]);

  const coverage = buildCoverage(companies, reports, syncRuns);
  printSummary(coverage, reports.length);

  const rows = filterRows(coverage)
    .sort((a, b) => a.symbol.localeCompare(b.symbol))
    .slice(0, limit);

  console.table(
    rows.map((row) => ({
      symbol: row.symbol,
      status: row.latestStatus,
      reports: row.reportCount,
      latestCount: row.latestSyncedCount,
      finishedAt: row.finishedAt ?? "",
      exchange: row.exchange,
      error: row.error,
      name: row.name,
    })),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
