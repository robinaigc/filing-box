import type { SupabaseClient } from "@supabase/supabase-js";
import type { Company } from "@/lib/types";

const reportCategories = [
  "category_ndbg_szsh",
  "category_bndbg_szsh",
  "category_yjdbg_szsh",
  "category_sjdbg_szsh",
];

type CninfoAnnouncement = {
  announcementId: string;
  announcementTitle: string;
  announcementTime: number;
  adjunctUrl: string;
};

type CninfoResponse = {
  announcements: CninfoAnnouncement[] | null;
};

type ReportUpsertRow = {
  id: string;
  company_id: string;
  market: "CN";
  symbol: string;
  company_name: string;
  exchange: string;
  report_type: string;
  title: string;
  year: number;
  period: "FY" | "Q1" | "Q3" | "H1" | "OTHER";
  filing_date: string;
  source: "CNINFO";
  source_url: string;
  download_url: string;
  accession_number: string;
};

export type CninfoSyncRun = {
  status: "success" | "empty" | "failed";
  syncedCount: number;
  errorMessage: string | null;
  finishedAt: string;
};

function cleanTitle(title: string): string {
  return title.replace(/<[^>]+>/g, "").trim();
}

function classifyReport(title: string):
  | { reportType: string; period: "FY" | "Q1" | "Q3" | "H1" | "OTHER"; year: number }
  | null {
  if (title.includes("摘要") || title.includes("英文") || title.includes("取消")) return null;

  const yearMatch = title.match(/(20\d{2})\s*年/);
  if (!yearMatch) return null;

  const year = Number(yearMatch[1]);

  if (title.includes("半年度报告")) return { reportType: "半年报", period: "H1", year };
  if (title.includes("年度报告")) return { reportType: "年报", period: "FY", year };
  if (title.includes("第一季度报告")) return { reportType: "一季报", period: "Q1", year };
  if (title.includes("第三季度报告")) return { reportType: "三季报", period: "Q3", year };

  return null;
}

function filingDateFromTime(time: number): string {
  return new Date(time).toISOString().slice(0, 10);
}

function cninfoUrl(path: string): string {
  return `https://static.cninfo.com.cn/${path}`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAnnouncementsByCategory(
  company: Company,
  category: string,
): Promise<CninfoAnnouncement[]> {
  if (!company.orgId) return [];

  const params = new URLSearchParams({
    pageNum: "1",
    pageSize: "20",
    column: company.exchange === "SSE" ? "sse" : "szse",
    tabName: "fulltext",
    plate: "",
    stock: `${company.symbol},${company.orgId}`,
    searchkey: "",
    secid: "",
    category,
    trade: "",
    seDate: `2023-01-01~${today()}`,
    sortName: "",
    sortType: "",
    isHLtitle: "true",
  });

  const response = await fetch("https://www.cninfo.com.cn/new/hisAnnouncement/query", {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 FilingBox",
      Referer: `https://www.cninfo.com.cn/new/disclosure/stock?stockCode=${company.symbol}&orgId=${company.orgId}`,
      Origin: "https://www.cninfo.com.cn",
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    throw new Error(`CNINFO request failed ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as CninfoResponse;
  return json.announcements ?? [];
}

async function fetchAnnouncements(company: Company): Promise<CninfoAnnouncement[]> {
  const all: CninfoAnnouncement[] = [];

  for (const category of reportCategories) {
    all.push(...(await fetchAnnouncementsByCategory(company, category)));
    await sleep(300);
  }

  const seen = new Set<string>();
  return all.filter((announcement) => {
    if (seen.has(announcement.announcementId)) return false;
    seen.add(announcement.announcementId);
    return true;
  });
}

export async function getRecentCninfoSyncRun(
  supabase: SupabaseClient,
  symbol: string,
): Promise<CninfoSyncRun | null> {
  const { data, error } = await supabase
    .from("cninfo_sync_runs")
    .select("status, synced_count, error_message, finished_at")
    .eq("symbol", symbol)
    .order("finished_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    if (error.code === "42P01" || error.message.includes("cninfo_sync_runs")) {
      console.warn(`${symbol}: cninfo_sync_runs is not available; skipping TTL check`);
      return null;
    }

    throw error;
  }

  if (!data) return null;

  return {
    status: data.status as CninfoSyncRun["status"],
    syncedCount: Number(data.synced_count ?? 0),
    errorMessage: data.error_message ?? null,
    finishedAt: data.finished_at,
  };
}

export function isFreshCninfoSyncRun(run: CninfoSyncRun | null, ttlHours = 24): boolean {
  if (!run) return false;

  const finishedAt = new Date(run.finishedAt).getTime();
  if (Number.isNaN(finishedAt)) return false;

  return Date.now() - finishedAt < ttlHours * 60 * 60 * 1000;
}

export async function syncCninfoReportsForCompany(
  supabase: SupabaseClient,
  company: Company,
): Promise<number> {
  if (company.market !== "CN" || !company.orgId) return 0;

  const startedAt = new Date().toISOString();

  try {
    const announcements = await fetchAnnouncements(company);
    const rows = announcements
      .map((announcement) => {
        const title = cleanTitle(announcement.announcementTitle);
        const classification = classifyReport(title);
        if (!classification) return null;

        const url = cninfoUrl(announcement.adjunctUrl);

        return {
          id: `cninfo-${company.symbol}-${announcement.announcementId}`,
          company_id: company.id,
          market: "CN",
          symbol: company.symbol,
          company_name: company.displayName,
          exchange: company.exchange,
          report_type: classification.reportType,
          title: `${company.displayName} ${title}`,
          year: classification.year,
          period: classification.period,
          filing_date: filingDateFromTime(announcement.announcementTime),
          source: "CNINFO",
          source_url: url,
          download_url: url,
          accession_number: announcement.announcementId,
        };
      })
      .filter((row): row is ReportUpsertRow => row !== null)
      .slice(0, 12);

    if (rows.length > 0) {
      const { error } = await supabase.from("reports").upsert(rows, { onConflict: "id" });
      if (error) throw error;
    }

    await recordSyncRun(
      supabase,
      company,
      rows.length > 0 ? "success" : "empty",
      rows.length,
      startedAt,
    );
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
  const { error } = await supabase.from("cninfo_sync_runs").insert({
    company_id: company.id,
    symbol: company.symbol,
    org_id: company.orgId ?? null,
    status,
    synced_count: syncedCount,
    error_message: errorMessage ? errorMessage.slice(0, 2000) : null,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
  });

  if (error) {
    console.warn(`${company.symbol}: failed to record CNINFO sync status: ${error.message}`);
  }
}
