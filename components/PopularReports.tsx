"use client";

import type { KeyboardEvent } from "react";
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

function getReportUrl(report: Report) {
  return report.downloadUrl || report.sourceUrl;
}

export function PopularReports({ reports, dataSourceLabel, onSelectCompany }: PopularReportsProps) {
  function handleRowKeyDown(event: KeyboardEvent<HTMLDivElement>, companyName: string) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onSelectCompany(companyName);
  }

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
        {reports.map((report) => {
          const reportUrl = getReportUrl(report);

          return (
            <div
              key={report.id}
              className="recent-row"
              role="link"
              tabIndex={0}
              onClick={() => onSelectCompany(report.companyName)}
              onKeyDown={(event) => handleRowKeyDown(event, report.companyName)}
            >
              <span className="recent-company">{report.companyName}</span>
              <span className="mono">{report.symbol}</span>
              <span>{marketLabel[report.market]}</span>
              <span>{report.reportType}</span>
              <span>{report.year}</span>
              <span>{report.filingDate}</span>
              {reportUrl ? (
                <a
                  className="download-pill"
                  href={reportUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(event) => event.stopPropagation()}
                  aria-label={`打开 ${report.companyName} ${report.reportType} ${report.filingDate} 财报`}
                >
                  下载
                </a>
              ) : (
                <span className="download-pill is-disabled" aria-disabled="true">
                  暂无
                </span>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
