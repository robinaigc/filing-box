import { normalizeQuery } from "@/lib/normalize";
import {
  getAliases,
  getAliasesAsync,
  getCompanies,
  getCompaniesAsync,
  getReports,
  getReportsAsync,
} from "@/lib/repository";
import type { Company, Report } from "@/lib/types";

export type SearchResult =
  | { status: "found"; company: Company; reports: Report[] }
  | { status: "not_found"; message: string }
  | { status: "ambiguous"; message: string };

const notFoundMessage = "没有找到该公司财报，请尝试输入准确股票代码或公司全称。";
const ambiguousMessage = "找到多个可能公司，请输入更准确的股票代码。";

export function sortReportsByDate(items: Report[]): Report[] {
  return [...items].sort(
    (a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime(),
  );
}

export function searchCompanyReports(query: string): SearchResult {
  const normalized = normalizeQuery(query);
  const companies = getCompanies();
  const aliases = getAliases();
  const reports = getReports();

  if (!normalized) {
    return { status: "not_found", message: "请输入公司名或股票代码。" };
  }

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
    return { status: "not_found", message: notFoundMessage };
  }

  if (matchedCompanyIds.size > 1) {
    return { status: "ambiguous", message: ambiguousMessage };
  }

  const companyId = [...matchedCompanyIds][0];
  const company = companies.find((item) => item.id === companyId);

  if (!company) {
    return { status: "not_found", message: notFoundMessage };
  }

  return {
    status: "found",
    company,
    reports: sortReportsByDate(reports.filter((report) => report.companyId === company.id)),
  };
}

export async function searchCompanyReportsAsync(query: string): Promise<SearchResult> {
  const normalized = normalizeQuery(query);
  const companies = await getCompaniesAsync();
  const aliases = await getAliasesAsync();
  const reports = await getReportsAsync();

  if (!normalized) {
    return { status: "not_found", message: "请输入公司名或股票代码。" };
  }

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
    return { status: "not_found", message: notFoundMessage };
  }

  if (matchedCompanyIds.size > 1) {
    return { status: "ambiguous", message: ambiguousMessage };
  }

  const companyId = [...matchedCompanyIds][0];
  const company = companies.find((item) => item.id === companyId);

  if (!company) {
    return { status: "not_found", message: notFoundMessage };
  }

  return {
    status: "found",
    company,
    reports: sortReportsByDate(reports.filter((report) => report.companyId === company.id)),
  };
}

export function getRecentReports(): Report[] {
  const companies = getCompanies();
  const reports = getReports();

  return sortReportsByDate(
    companies
      .map((company) =>
        sortReportsByDate(reports.filter((report) => report.companyId === company.id))[0],
      )
      .filter(Boolean) as Report[],
  ).slice(0, 6);
}

export async function getRecentReportsAsync(): Promise<Report[]> {
  const companies = await getCompaniesAsync();
  const reports = await getReportsAsync();

  return sortReportsByDate(
    companies
      .map((company) =>
        sortReportsByDate(reports.filter((report) => report.companyId === company.id))[0],
      )
      .filter(Boolean) as Report[],
  ).slice(0, 6);
}
