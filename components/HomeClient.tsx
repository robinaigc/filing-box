"use client";

import { useEffect, useState } from "react";
import { FilterBar, type Filters } from "@/components/FilterBar";
import { PopularReports } from "@/components/PopularReports";
import { ReportTable } from "@/components/ReportTable";
import { SearchBar } from "@/components/SearchBar";
import { StatusMessage } from "@/components/StatusMessage";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  getRecentReportsAsync,
  searchCompanyReports,
  type SearchResult,
} from "@/lib/search";
import type { Report } from "@/lib/types";

const initialFilters: Filters = {
  market: "all",
  reportType: "all",
  year: "all",
};

type HomeClientProps = {
  initialQuery: string;
  initialResult: SearchResult | null;
  initialRecentReports: Report[];
  initialDataSourceLabel: string;
};

function filterReports(reports: Report[], filters: Filters): Report[] {
  return reports.filter((report) => {
    const marketMatches = filters.market === "all" || report.market === filters.market;
    const typeMatches = filters.reportType === "all" || report.reportType === filters.reportType;
    const yearMatches =
      filters.year === "all" ||
      (filters.year === "更早" ? report.year < 2022 : report.year === Number(filters.year));

    return marketMatches && typeMatches && yearMatches;
  });
}

export function HomeClient({
  initialQuery,
  initialResult,
  initialRecentReports,
  initialDataSourceLabel,
}: HomeClientProps) {
  const [query, setQuery] = useState(initialQuery);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SearchResult | null>(initialResult);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [recentReports, setRecentReports] = useState<Report[]>(initialRecentReports);
  const [dataSourceLabel, setDataSourceLabel] = useState(initialDataSourceLabel);

  useEffect(() => {
    setDataSourceLabel(
      process.env.NEXT_PUBLIC_DATA_SOURCE === "supabase" ? "官方数据库" : "本地数据",
    );
    getRecentReportsAsync()
      .then((reports) => {
        if (reports.length > 0) setRecentReports(reports);
      })
      .catch(() => {
        setDataSourceLabel("本地数据");
      });
  }, []);

  const filteredReports =
    result?.status === "found" ? filterReports(result.reports, filters) : [];

  function runSearch(nextQuery = query) {
    setIsLoading(true);
    setResult(searchCompanyReports(nextQuery));
    window.setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(nextQuery)}`)
        .then((response) => {
          if (!response.ok) throw new Error("Search request failed");
          return response.json() as Promise<SearchResult>;
        })
        .then(setResult)
        .catch(() =>
          setResult({
            status: "not_found",
            message: "搜索暂时不可用，请稍后重试。",
          }),
        )
        .finally(() => {
          setFilters(initialFilters);
          setIsLoading(false);
        });
    }, 180);
  }

  function handleSelectCompany(companyName: string) {
    setQuery(companyName);
    runSearch(companyName);
  }

  return (
    <main className="page-shell">
      <div className="grid-layer" aria-hidden="true" />
      <header className="topbar">
        <div>
          <p className="eyebrow">Filing Box</p>
          <h1>财报盒子</h1>
        </div>
        <ThemeToggle />
      </header>

      <section className="hero">
        <div className="tag-stream" aria-hidden="true">
          {["10-K", "10-Q", "年报", "半年报", "一季报", "三季报"].map((tag) => (
            <span key={tag}>{tag}</span>
          ))}
        </div>
        <p className="hero-copy">输入公司名或股票代码，直接下载上市公司财报。</p>
        <p className="hero-note">只收录官方披露文件。不提供新闻、行情、研报和投资建议。</p>
        <SearchBar
          value={query}
          isLoading={isLoading}
          onChange={setQuery}
          onSubmit={() => runSearch()}
        />
      </section>

      <FilterBar filters={filters} onChange={setFilters} />

      <section className="result-region" aria-live="polite">
        {isLoading ? <StatusMessage message="正在搜索财报..." /> : null}

        {!isLoading && !result ? (
          <PopularReports
            reports={recentReports}
            dataSourceLabel={dataSourceLabel}
            onSelectCompany={handleSelectCompany}
          />
        ) : null}

        {!isLoading && result?.status === "not_found" ? (
          <StatusMessage tone="error" message={result.message} />
        ) : null}

        {!isLoading && result?.status === "ambiguous" ? (
          <StatusMessage tone="error" message={result.message} />
        ) : null}

        {!isLoading && result?.status === "found" ? (
          <section className="reports-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">Matched company</p>
                <h2>{result.company.displayName} 财报列表</h2>
              </div>
              <span className="count-chip">{result.reports.length} 份</span>
            </div>
            <StatusMessage
              tone="success"
              message={`已找到 ${result.reports.length} 份财报，按披露时间倒序排列。`}
            />
            {filteredReports.length > 0 ? (
              <ReportTable reports={filteredReports} />
            ) : (
              <StatusMessage message="该公司在当前筛选条件下暂无财报。" />
            )}
          </section>
        ) : null}
      </section>
    </main>
  );
}
