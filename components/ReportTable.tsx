import type { Report } from "@/lib/types";

type ReportTableProps = {
  reports: Report[];
};

const marketLabel = {
  US: "美股",
  CN: "A股",
};

export function ReportTable({ reports }: ReportTableProps) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>公司名称</th>
            <th>股票代码</th>
            <th>市场</th>
            <th>交易所</th>
            <th>报告类型</th>
            <th>报告期间</th>
            <th>报告年份</th>
            <th>披露日期</th>
            <th>报告标题</th>
            <th>来源</th>
            <th>下载</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td>{report.companyName}</td>
              <td className="mono">{report.symbol}</td>
              <td>{marketLabel[report.market]}</td>
              <td className="mono">{report.exchange}</td>
              <td>
                <span className="type-pill">{report.reportType}</span>
              </td>
              <td>{report.period}</td>
              <td>{report.year}</td>
              <td>{report.filingDate}</td>
              <td>{report.title}</td>
              <td>{report.source}</td>
              <td>
                {report.downloadUrl ? (
                  <a
                    className="table-link primary"
                    href={report.downloadUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                  >
                    {report.source === "CNINFO" ? "下载 PDF" : "打开文件"}
                  </a>
                ) : (
                  <button
                    className="table-link disabled"
                    type="button"
                    disabled
                    title="暂无下载链接，请打开官方来源查看。"
                  >
                    暂无下载
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
