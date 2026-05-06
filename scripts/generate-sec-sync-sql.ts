import { writeFileSync } from "node:fs";
import { companies } from "@/data/companies";

const allowedForms = new Set(["10-K", "10-Q", "20-F", "6-K", "40-F"]);
const secUserAgent = process.env.SEC_USER_AGENT ?? "FilingBox robin990083@gmail.com";
const symbolArg = process.argv.find((arg) => arg.startsWith("--symbol="))?.split("=")[1];

type SecSubmission = {
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
    };
  };
};

function sql(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "null";
  if (typeof value === "number") return String(value);
  return `'${value.replace(/'/g, "''")}'`;
}

function compactCik(cik: string): string {
  return cik.replace(/^0+/, "").padStart(10, "0");
}

function secArchiveUrl(cik: string, accessionNumber: string, primaryDocument: string): string {
  const compact = cik.replace(/^0+/, "");
  const accessionPath = accessionNumber.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${compact}/${accessionPath}/${primaryDocument}`;
}

function reportPeriod(form: string, reportDate: string): "FY" | "Q1" | "Q2" | "Q3" | "OTHER" {
  if (form === "10-K" || form === "20-F" || form === "40-F") return "FY";

  if (form === "10-Q" && reportDate) {
    const month = new Date(reportDate).getUTCMonth() + 1;
    if (month <= 4) return "Q1";
    if (month <= 7) return "Q2";
    return "Q3";
  }

  return "OTHER";
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSubmission(cik: string): Promise<SecSubmission> {
  const response = await fetch(`https://data.sec.gov/submissions/CIK${compactCik(cik)}.json`, {
    headers: {
      "User-Agent": secUserAgent,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`SEC request failed ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as SecSubmission;
}

async function main() {
  const targetCompanies = companies.filter(
    (company) =>
      company.market === "US" &&
      company.cik &&
      (!symbolArg || company.symbol.toUpperCase() === symbolArg.toUpperCase()),
  );

  const lines = [
    "-- Generated SEC EDGAR sync SQL.",
    "-- Source: https://data.sec.gov/submissions/CIK##########.json",
    "begin;",
    "",
  ];

  let total = 0;

  for (const company of targetCompanies) {
    const submission = await fetchSubmission(company.cik as string);
    const recent = submission.filings.recent;
    const filings = recent.form
      .map((form, index) => ({
        form,
        accessionNumber: recent.accessionNumber[index],
        filingDate: recent.filingDate[index],
        reportDate: recent.reportDate[index],
        primaryDocument: recent.primaryDocument[index],
      }))
      .filter((filing) => allowedForms.has(filing.form))
      .slice(0, 10);

    for (const filing of filings) {
      const url = secArchiveUrl(company.cik as string, filing.accessionNumber, filing.primaryDocument);
      const year = new Date(filing.filingDate).getUTCFullYear();
      const id = `sec-${company.symbol.toLowerCase()}-${filing.accessionNumber}`;
      const title = `${company.displayName} ${filing.form} ${filing.reportDate || filing.filingDate}`;

      lines.push(
        [
          "insert into public.reports",
          "(id, company_id, market, symbol, company_name, exchange, report_type, title, year, period, filing_date, source, source_url, download_url, accession_number)",
          "values",
          `(${sql(id)}, ${sql(company.id)}, 'US', ${sql(company.symbol)}, ${sql(company.displayName)}, ${sql(company.exchange)}, ${sql(filing.form)}, ${sql(title)}, ${year}, ${sql(reportPeriod(filing.form, filing.reportDate))}, ${sql(filing.filingDate)}, 'SEC', ${sql(url)}, ${sql(url)}, ${sql(filing.accessionNumber)})`,
          "on conflict (id) do update set",
          "report_type = excluded.report_type,",
          "title = excluded.title,",
          "year = excluded.year,",
          "period = excluded.period,",
          "filing_date = excluded.filing_date,",
          "source_url = excluded.source_url,",
          "download_url = excluded.download_url,",
          "accession_number = excluded.accession_number;",
        ].join(" "),
      );
      total += 1;
    }

    console.log(`${company.symbol}: prepared ${filings.length} filings`);
    await sleep(1100);
  }

  lines.push("", "commit;", "");
  writeFileSync("supabase/sec-sync.sql", lines.join("\n"), "utf8");
  console.log(`Generated supabase/sec-sync.sql with ${total} SEC filings.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
