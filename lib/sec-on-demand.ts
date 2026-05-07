import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Company, Report } from "@/lib/types";

const allowedForms = new Set(["10-K", "10-Q", "20-F", "6-K", "40-F"]);

type SecSubmission = {
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
    };
  };
};

type ReportRow = {
  id: string;
  company_id: string;
  company_name: string;
  market: "US" | "CN";
  symbol: string;
  exchange: string;
  report_type: string;
  period: "FY" | "Q1" | "Q2" | "Q3" | "H1" | "OTHER";
  year: number;
  filing_date: string;
  title: string;
  source: "SEC" | "CNINFO" | "MOCK";
  source_url: string | null;
  download_url: string | null;
};

export function createServiceSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

function compactCik(cik: string): string {
  return cik.replace(/^0+/, "").padStart(10, "0");
}

function secArchiveUrl(cik: string, accessionNumber: string, primaryDocument: string): string {
  const compact = cik.replace(/^0+/, "");
  const accessionPath = accessionNumber.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${compact}/${accessionPath}/${primaryDocument}`;
}

function reportPeriod(
  form: string,
  reportDate: string,
): "FY" | "Q1" | "Q2" | "Q3" | "H1" | "OTHER" {
  if (form.includes("10-K") || form.includes("20-F") || form.includes("40-F")) return "FY";

  if (form === "10-Q" && reportDate) {
    const month = new Date(reportDate).getUTCMonth() + 1;
    if (month <= 4) return "Q1";
    if (month <= 7) return "Q2";
    return "Q3";
  }

  return "OTHER";
}

function reportYear(filingDate: string): number {
  return new Date(filingDate).getUTCFullYear();
}

function mapReport(row: ReportRow): Report {
  return {
    id: row.id,
    companyId: row.company_id,
    companyName: row.company_name,
    market: row.market,
    symbol: row.symbol,
    exchange: row.exchange,
    reportType: row.report_type,
    period: row.period,
    year: row.year,
    filingDate: row.filing_date,
    title: row.title,
    source: row.source,
    sourceUrl: row.source_url ?? "",
    downloadUrl: row.download_url ?? "",
  };
}

async function fetchSubmission(cik: string): Promise<SecSubmission> {
  const secUserAgent = process.env.SEC_USER_AGENT;
  if (!secUserAgent) {
    throw new Error("SEC_USER_AGENT is required, for example FilingBox robin990083@gmail.com");
  }

  const response = await fetch(`https://data.sec.gov/submissions/CIK${compactCik(cik)}.json`, {
    headers: {
      "User-Agent": secUserAgent,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`SEC request failed ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as SecSubmission;
}

export async function getCompanyReports(
  supabase: SupabaseClient,
  companyId: string,
): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, company_id, company_name, market, symbol, exchange, report_type, period, year, filing_date, title, source, source_url, download_url",
    )
    .eq("company_id", companyId)
    .order("filing_date", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ReportRow[]).map(mapReport);
}

export async function syncSecReportsForCompany(
  supabase: SupabaseClient,
  company: Company,
): Promise<number> {
  if (company.market !== "US" || !company.cik) return 0;

  const startedAt = new Date().toISOString();

  try {
    const submission = await fetchSubmission(company.cik);
    const recent = submission.filings.recent;
    const rows = recent.form
      .map((form, index) => ({
        form,
        accessionNumber: recent.accessionNumber[index],
        filingDate: recent.filingDate[index],
        reportDate: recent.reportDate[index],
        primaryDocument: recent.primaryDocument[index],
      }))
      .filter((filing) => allowedForms.has(filing.form))
      .slice(0, 20)
      .map((filing) => {
        const documentUrl = secArchiveUrl(
          company.cik as string,
          filing.accessionNumber,
          filing.primaryDocument,
        );

        return {
          id: `sec-${company.symbol.toLowerCase()}-${filing.accessionNumber}`,
          company_id: company.id,
          market: "US",
          symbol: company.symbol,
          company_name: company.displayName,
          exchange: company.exchange,
          report_type: filing.form,
          title: `${company.displayName} ${filing.form} ${filing.reportDate || filing.filingDate}`,
          year: reportYear(filing.filingDate),
          period: reportPeriod(filing.form, filing.reportDate),
          filing_date: filing.filingDate,
          source: "SEC",
          source_url: documentUrl,
          download_url: documentUrl,
          accession_number: filing.accessionNumber,
        };
      });

    if (rows.length > 0) {
      const { error } = await supabase.from("reports").upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }

    await recordSyncRun(supabase, company, rows.length > 0 ? "success" : "empty", rows.length, startedAt);
    return rows.length;
  } catch (error) {
    await recordSyncRun(
      supabase,
      company,
      "failed",
      0,
      startedAt,
      error instanceof Error ? error.message : String(error),
    );
    throw error;
  }
}

async function recordSyncRun(
  supabase: SupabaseClient,
  company: Company,
  status: "success" | "empty" | "failed",
  syncedCount: number,
  startedAt: string,
  errorMessage?: string,
) {
  const { error } = await supabase.from("sec_sync_runs").insert({
    company_id: company.id,
    symbol: company.symbol,
    cik: company.cik ?? null,
    status,
    synced_count: syncedCount,
    error_message: errorMessage ? errorMessage.slice(0, 2000) : null,
    offset_value: null,
    limit_value: null,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
  });

  if (error) {
    console.warn(`${company.symbol}: failed to record on-demand sync status: ${error.message}`);
  }
}
