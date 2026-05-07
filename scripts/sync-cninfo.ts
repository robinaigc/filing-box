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
const symbolArg = process.argv.find((arg) => arg.startsWith("--symbol="))?.split("=")[1];
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
const offsetArg = process.argv.find((arg) => arg.startsWith("--offset="))?.split("=")[1];
const limit = limitArg ? Number(limitArg) : undefined;
const offset = offsetArg ? Number(offsetArg) : 0;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

if (limit !== undefined && (!Number.isInteger(limit) || limit <= 0)) {
  throw new Error("--limit must be a positive integer.");
}

if (!Number.isInteger(offset) || offset < 0) {
  throw new Error("--offset must be a non-negative integer.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type CompanyRow = {
  id: string;
  market: "US" | "CN";
  symbol: string;
  name: string;
  display_name: string;
  exchange: string;
  org_id: string | null;
};

type CninfoAnnouncement = {
  secCode: string;
  secName: string;
  orgId: string;
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

const reportCategories = [
  "category_ndbg_szsh",
  "category_bndbg_szsh",
  "category_yjdbg_szsh",
  "category_sjdbg_szsh",
];

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

  if (title.includes("年度报告")) return { reportType: "年报", period: "FY", year };
  if (title.includes("半年度报告")) return { reportType: "半年报", period: "H1", year };
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

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchAnnouncementsByCategory(
  company: CompanyRow,
  category: string,
): Promise<CninfoAnnouncement[]> {
  const params = new URLSearchParams({
    pageNum: "1",
    pageSize: "20",
    column: company.exchange === "SSE" ? "sse" : "szse",
    tabName: "fulltext",
    plate: "",
    stock: company.org_id ? `${company.symbol},${company.org_id}` : "",
    searchkey: company.org_id ? "" : company.display_name,
    secid: "",
    category,
    trade: "",
    seDate: "2023-01-01~2026-05-06",
    sortName: "",
    sortType: "",
    isHLtitle: "true",
  });

  const response = await fetch("https://www.cninfo.com.cn/new/hisAnnouncement/query", {
    method: "POST",
    headers: {
      "User-Agent": "Mozilla/5.0 FilingBox",
      Referer: `https://www.cninfo.com.cn/new/disclosure/stock?stockCode=${company.symbol}`,
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

async function fetchAnnouncements(company: CompanyRow): Promise<CninfoAnnouncement[]> {
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

async function syncCompany(company: CompanyRow) {
  if (!company.org_id) {
    console.warn(`${company.symbol}: missing CNINFO org_id, skipped`);
    return 0;
  }

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
        company_name: company.display_name,
        exchange: company.exchange,
        report_type: classification.reportType,
        title: `${company.display_name} ${title}`,
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

  if (rows.length === 0) return 0;

  const { error } = await supabase.from("reports").upsert(rows, { onConflict: "id" });
  if (error) throw error;

  return rows.length;
}

async function main() {
  let query = supabase
    .from("companies")
    .select("id, market, symbol, name, display_name, exchange, org_id")
    .eq("market", "CN");

  if (symbolArg) {
    query = query.eq("symbol", symbolArg);
  }

  if (limit !== undefined) {
    query = query.range(offset, offset + limit - 1);
  } else if (offset > 0) {
    query = query.range(offset, offset + 999);
  }

  const { data, error } = await query.order("symbol", { ascending: true });
  if (error) throw error;

  const companies = (data ?? []) as CompanyRow[];
  let total = 0;

  for (const company of companies) {
    const count = await syncCompany(company);
    total += count;
    console.log(`${company.symbol}: synced ${count} CNINFO reports`);
    await sleep(1000);
  }

  console.log(`CNINFO sync completed. Synced ${total} reports for ${companies.length} companies.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
