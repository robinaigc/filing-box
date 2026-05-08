import { NextResponse } from "next/server";
import {
  getRecentCninfoSyncRun,
  isFreshCninfoSyncRun,
  syncCninfoReportsForCompany,
} from "@/lib/cninfo-on-demand";
import {
  createServiceSupabaseClient,
  getRecentSecSyncRun,
  isFreshSyncRun,
  syncSecReportsForCompany,
} from "@/lib/sec-on-demand";
import type { Company } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

type CompanyRow = {
  id: string;
  market: "US" | "CN";
  symbol: string;
  code: string | null;
  name: string;
  display_name: string;
  exchange: string;
  cik: string | null;
  org_id: string | null;
};

type SyncResult = {
  symbol: string;
  market: Company["market"];
  status: "synced" | "skipped" | "failed";
  count: number;
  error?: string;
};

const dailyUniverse = [
  "AAPL",
  "MSFT",
  "NVDA",
  "TSLA",
  "GOOGL",
  "AMZN",
  "META",
  "BRK.B",
  "600519",
  "000858",
  "300750",
  "002594",
  "000333",
  "600036",
  "601318",
  "000001",
];

function mapCompany(row: CompanyRow): Company {
  return {
    id: row.id,
    market: row.market,
    symbol: row.symbol,
    code: row.code ?? undefined,
    name: row.name,
    displayName: row.display_name,
    exchange: row.exchange,
    cik: row.cik ?? undefined,
    orgId: row.org_id ?? undefined,
  };
}

function dailySlice(symbols: string[], size: number) {
  const dayIndex = Math.floor(Date.now() / 86_400_000);
  const start = (dayIndex * size) % symbols.length;

  return Array.from({ length: size }, (_, index) => symbols[(start + index) % symbols.length]);
}

async function fetchCompanies(symbols: string[]) {
  const supabase = createServiceSupabaseClient();

  const { data, error } = await supabase
    .from("companies")
    .select("id, market, symbol, code, name, display_name, exchange, cik, org_id")
    .in("symbol", symbols);

  if (error) throw error;

  return {
    supabase,
    companies: ((data ?? []) as CompanyRow[]).map(mapCompany),
  };
}

async function syncCompany(
  supabase: ReturnType<typeof createServiceSupabaseClient>,
  company: Company,
): Promise<SyncResult> {
  try {
    if (company.market === "US") {
      if (!company.cik) {
        return { symbol: company.symbol, market: company.market, status: "skipped", count: 0 };
      }

      const recentRun = await getRecentSecSyncRun(supabase, company.symbol);
      if (isFreshSyncRun(recentRun, 20)) {
        return { symbol: company.symbol, market: company.market, status: "skipped", count: 0 };
      }

      const count = await syncSecReportsForCompany(supabase, company);
      return { symbol: company.symbol, market: company.market, status: "synced", count };
    }

    if (!company.orgId) {
      return { symbol: company.symbol, market: company.market, status: "skipped", count: 0 };
    }

    const recentRun = await getRecentCninfoSyncRun(supabase, company.symbol);
    if (isFreshCninfoSyncRun(recentRun, 20)) {
      return { symbol: company.symbol, market: company.market, status: "skipped", count: 0 };
    }

    const count = await syncCninfoReportsForCompany(supabase, company);
    return { symbol: company.symbol, market: company.market, status: "synced", count };
  } catch (error) {
    return {
      symbol: company.symbol,
      market: company.market,
      status: "failed",
      count: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const targetSymbols = dailySlice(dailyUniverse, 6);
  const { supabase, companies } = await fetchCompanies(targetSymbols);
  const companyBySymbol = new Map(companies.map((company) => [company.symbol, company]));
  const orderedCompanies = targetSymbols
    .map((symbol) => companyBySymbol.get(symbol))
    .filter((company): company is Company => Boolean(company));

  const results: SyncResult[] = [];

  for (const company of orderedCompanies) {
    results.push(await syncCompany(supabase, company));
  }

  return NextResponse.json({
    ok: true,
    scheduledAt: new Date().toISOString(),
    targetSymbols,
    results,
  });
}
