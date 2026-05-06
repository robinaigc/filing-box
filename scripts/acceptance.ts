import { companies } from "@/data/companies";
import { reports } from "@/data/reports";
import { getRecentReports, searchCompanyReports } from "@/lib/search";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function expectFound(query: string, companyId: string) {
  const result = searchCompanyReports(query);
  assert(result.status === "found", `${query} should find ${companyId}`);

  if (result.status === "found") {
    assert(result.company.id === companyId, `${query} matched ${result.company.id}`);
    assert(result.reports.length >= 5, `${query} should return at least 5 reports`);
    assert(
      result.reports.every((report) => report.companyId === companyId),
      `${query} returned reports from another company`,
    );
    assert(
      result.reports.every((report, index, list) => {
        if (index === 0) return true;
        return (
          new Date(list[index - 1].filingDate).getTime() >=
          new Date(report.filingDate).getTime()
        );
      }),
      `${query} reports are not sorted by filingDate desc`,
    );
  }
}

function expectNotFound(query: string) {
  const result = searchCompanyReports(query);
  assert(result.status === "not_found", `${query} should not return a company`);
}

const cases: Array<[string, string]> = [
  ["AAPL", "apple"],
  ["苹果", "apple"],
  ["苹果公司", "apple"],
  ["MSFT", "microsoft"],
  ["微软", "microsoft"],
  ["NVDA", "nvidia"],
  ["英伟达", "nvidia"],
  ["600519", "kweichow-moutai"],
  ["贵州茅台", "kweichow-moutai"],
  ["300750", "catl"],
  ["宁德时代", "catl"],
  ["300059", "east-money"],
  ["东方财富", "east-money"],
  ["东财", "east-money"],
  ["002594", "byd"],
  ["比亚迪", "byd"],
  ["600036", "cmb"],
  ["招商银行", "cmb"],
  ["AMZN", "amazon"],
  ["亚马逊", "amazon"],
  ["GOOGL", "alphabet"],
  ["谷歌", "alphabet"],
  ["META", "meta"],
  ["脸书", "meta"],
];

for (const [query, companyId] of cases) {
  expectFound(query, companyId);
}

for (const query of ["银行", "科技", "能源", "不存在的公司"]) {
  expectNotFound(query);
}

for (const company of companies) {
  const companyReports = reports.filter((report) => report.companyId === company.id);
  assert(companyReports.length >= 5, `${company.displayName} should have at least 5 reports`);
}

const recentReports = getRecentReports();
assert(recentReports.length === 6, "recent reports should contain 6 items");
assert(
  recentReports.every((report, index, list) => {
    if (index === 0) return true;
    return (
      new Date(list[index - 1].filingDate).getTime() >= new Date(report.filingDate).getTime()
    );
  }),
  "recent reports are not sorted by filingDate desc",
);

console.log("Acceptance checks passed.");
