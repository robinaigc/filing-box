import { createClient } from "@supabase/supabase-js";

const allowedForms = new Set(["10-K", "10-Q", "20-F", "6-K", "40-F"]);
const secUserAgent = process.env.SEC_USER_AGENT;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const symbolArg = process.argv.find((arg) => arg.startsWith("--symbol="))?.split("=")[1];

if (!secUserAgent) {
  throw new Error("SEC_USER_AGENT is required, for example FilingBox robin990083@gmail.com");
}

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type CompanyRow = {
  id: string;
  market: "US" | "CN";
  symbol: string;
  name: string;
  display_name: string;
  exchange: string;
  cik: string | null;
};

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

function compactCik(cik: string): string {
  return cik.replace(/^0+/, "").padStart(10, "0");
}

function secArchiveUrl(cik: string, accessionNumber: string, primaryDocument: string): string {
  const compact = cik.replace(/^0+/, "");
  const accessionPath = accessionNumber.replace(/-/g, "");
  return `https://www.sec.gov/Archives/edgar/data/${compact}/${accessionPath}/${primaryDocument}`;
}

function reportPeriod(
  form: string,
  reportDate: string,
): "FY" | "Q1" | "Q2" | "Q3" | "H1" | "OTHER" {
  if (form.includes("10-K") || form.includes("20-F") || form.includes("40-F")) return "FY";

  if (form === "10-Q" && reportDate) {
    const month = new Date(reportDate).getUTCMonth() + 1;
    if (month <= 4) return "Q1";
    if (month <= 7) return "Q2";
    return "Q3";
  }

  return "OTHER";
}

function reportYear(filingDate: string): number {
  return new Date(filingDate).getUTCFullYear();
}

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchSubmission(cik: string): Promise<SecSubmission> {
  const response = await fetch(`https://data.sec.gov/submissions/CIK${compactCik(cik)}.json`, {
    headers: {
      "User-Agent": secUserAgent as string,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`SEC request failed ${response.status} ${response.statusText}`);
  }

  return (await response.json()) as SecSubmission;
}

async function syncCompany(company: CompanyRow) {
  if (!company.cik) return 0;

  const submission = await fetchSubmission(company.cik);
  const recent = submission.filings.recent;
  const rows = recent.form
    .map((form, index) => ({
      form,
      accessionNumber: recent.accessionNumber[index],
      filingDate: recent.filingDate[index],
      reportDate: recent.reportDate[index],
      primaryDocument: recent.primaryDocument[index],
    }))
    .filter((filing) => allowedForms.has(filing.form))
    .slice(0, 20)
    .map((filing) => {
      const documentUrl = secArchiveUrl(company.cik as string, filing.accessionNumber, filing.primaryDocument);

      return {
        id: `sec-${company.symbol.toLowerCase()}-${filing.accessionNumber}`,
        company_id: company.id,
        market: "US",
        symbol: company.symbol,
        company_name: company.display_name,
        exchange: company.exchange,
        report_type: filing.form,
        title: `${company.display_name} ${filing.form} ${filing.reportDate || filing.filingDate}`,
        year: reportYear(filing.filingDate),
        period: reportPeriod(filing.form, filing.reportDate),
        filing_date: filing.filingDate,
        source: "SEC",
        source_url: documentUrl,
        download_url: documentUrl,
        accession_number: filing.accessionNumber,
      };
    });

  if (rows.length === 0) return 0;

  const { error } = await supabase.from("reports").upsert(rows, { onConflict: "id" });
  if (error) throw error;

  return rows.length;
}

async function main() {
  let query = supabase
    .from("companies")
    .select("id, market, symbol, name, display_name, exchange, cik")
    .eq("market", "US")
    .not("cik", "is", null);

  if (symbolArg) {
    query = query.eq("symbol", symbolArg.toUpperCase());
  }

  const { data, error } = await query.order("symbol", { ascending: true });
  if (error) throw error;

  const companies = (data ?? []) as CompanyRow[];
  let total = 0;

  for (const company of companies) {
    const count = await syncCompany(company);
    total += count;
    console.log(`${company.symbol}: synced ${count} SEC filings`);
    await sleep(1100);
  }

  console.log(`SEC sync completed. Synced ${total} filings for ${companies.length} companies.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
