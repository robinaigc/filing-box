"use client";

import type { Report } from "@/lib/types";

type PopularReportsProps = {
  reports: Report[];
  dataSourceLabel: string;
  onSelectCompany: (companyName: string) => void;
};

const marketLabel = {
  US: "美股",
  CN: "A股",
};

export function PopularReports({ reports, dataSourceLabel, onSelectCompany }: PopularReportsProps) {
  return (
    <section className="recent-section" aria-labelledby="recent-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Recent filings</p>
          <h2 id="recent-title">最近披露</h2>
        </div>
        <div className="live-dot" aria-hidden="true">
          <span />
          {dataSourceLabel}
        </div>
      </div>
      <div className="recent-list">
        {reports.map((report) => (
          <button
            key={report.id}
            className="recent-row"
            type="button"
            onClick={() => onSelectCompany(report.companyName)}
          >
            <span className="recent-company">{report.companyName}</span>
            <span className="mono">{report.symbol}</span>
            <span>{marketLabel[report.market]}</span>
            <span>{report.reportType}</span>
            <span>{report.year}</span>
            <span>{report.filingDate}</span>
            <span>{report.downloadUrl ? "可下载" : "官方来源"}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
