import { NextResponse } from "next/server";
import { normalizeQuery } from "@/lib/normalize";
import {
  createServiceSupabaseClient,
  getCompanyReports,
  syncSecReportsForCompany,
} from "@/lib/sec-on-demand";
import { sortReportsByDate, type SearchResult } from "@/lib/search";
import type { Company, CompanyAlias } from "@/lib/types";

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

type AliasRow = {
  company_id: string;
  alias: string;
  language: "en" | "zh";
  alias_type: "ticker" | "code" | "official_name" | "short_name" | "common_name";
};

const notFoundMessage = "没有找到该公司财报，请尝试输入准确股票代码或公司全称。";
const ambiguousMessage = "找到多个可能公司，请输入更准确的股票代码。";

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

function mapAlias(row: AliasRow): CompanyAlias {
  return {
    companyId: row.company_id,
    alias: row.alias,
    language: row.language,
    aliasType: row.alias_type,
  };
}

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q") ?? "";
  const normalized = normalizeQuery(query);

  if (!normalized) {
    return NextResponse.json<SearchResult>({
      status: "not_found",
      message: "请输入公司名或股票代码。",
    });
  }

  try {
    const supabase = createServiceSupabaseClient();
    const [{ data: companyRows, error: companyError }, { data: aliasRows, error: aliasError }] =
      await Promise.all([
        supabase
          .from("companies")
          .select("id, market, symbol, code, name, display_name, exchange, cik, org_id"),
        supabase.from("company_aliases").select("company_id, alias, language, alias_type"),
      ]);

    if (companyError) throw companyError;
    if (aliasError) throw aliasError;

    const companies = ((companyRows ?? []) as CompanyRow[]).map(mapCompany);
    const aliases = ((aliasRows ?? []) as AliasRow[]).map(mapAlias);
    const matchedCompanyIds = new Set<string>();

    for (const company of companies) {
      const candidates = [company.symbol, company.code, company.name, company.displayName].filter(
        Boolean,
      ) as string[];

      if (candidates.some((candidate) => normalizeQuery(candidate) === normalized)) {
        matchedCompanyIds.add(company.id);
      }
    }

    for (const alias of aliases) {
      if (normalizeQuery(alias.alias) === normalized) {
        matchedCompanyIds.add(alias.companyId);
      }
    }

    if (matchedCompanyIds.size === 0) {
      return NextResponse.json<SearchResult>({
        status: "not_found",
        message: notFoundMessage,
      });
    }

    if (matchedCompanyIds.size > 1) {
      return NextResponse.json<SearchResult>({
        status: "ambiguous",
        message: ambiguousMessage,
      });
    }

    const companyId = [...matchedCompanyIds][0];
    const company = companies.find((item) => item.id === companyId);

    if (!company) {
      return NextResponse.json<SearchResult>({
        status: "not_found",
        message: notFoundMessage,
      });
    }

    let reports = await getCompanyReports(supabase, company.id);

    if (reports.length === 0 && company.market === "US" && company.cik) {
      await syncSecReportsForCompany(supabase, company);
      reports = await getCompanyReports(supabase, company.id);
    }

    return NextResponse.json<SearchResult>({
      status: "found",
      company,
      reports: sortReportsByDate(reports),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json<SearchResult>(
      {
        status: "not_found",
        message: "搜索暂时不可用，请稍后重试。",
      },
      { status: 500 },
    );
  }
}
