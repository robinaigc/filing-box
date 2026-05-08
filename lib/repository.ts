import { aliases } from "@/data/aliases";
import { companies } from "@/data/companies";
import { reports } from "@/data/reports";
import { supabase } from "@/lib/supabase";
import type { Company, CompanyAlias, Report } from "@/lib/types";

export type DataSource = "local" | "supabase";

export function getDataSource(): DataSource {
  return process.env.NEXT_PUBLIC_DATA_SOURCE !== "local" && supabase ? "supabase" : "local";
}

export function getCompanies(): Company[] {
  return companies;
}

export function getAliases(): CompanyAlias[] {
  return aliases;
}

export function getReports(): Report[] {
  return reports;
}

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

export function mapReportRow(row: ReportRow): Report {
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

export async function getCompaniesAsync(): Promise<Company[]> {
  if (getDataSource() !== "supabase" || !supabase) return getCompanies();

  const { data, error } = await supabase
    .from("companies")
    .select("id, market, symbol, code, name, display_name, exchange, cik, org_id")
    .order("symbol", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as CompanyRow[]).map(mapCompany);
}

export async function getAliasesAsync(): Promise<CompanyAlias[]> {
  if (getDataSource() !== "supabase" || !supabase) return getAliases();

  const { data, error } = await supabase
    .from("company_aliases")
    .select("company_id, alias, language, alias_type");

  if (error) throw error;
  return ((data ?? []) as AliasRow[]).map(mapAlias);
}

export async function getReportsAsync(): Promise<Report[]> {
  if (getDataSource() !== "supabase" || !supabase) return getReports();

  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, company_id, company_name, market, symbol, exchange, report_type, period, year, filing_date, title, source, source_url, download_url",
    )
    .order("filing_date", { ascending: false });

  if (error) throw error;
  return ((data ?? []) as ReportRow[]).map(mapReportRow);
}
