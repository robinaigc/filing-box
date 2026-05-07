import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { normalizeQuery } from "@/lib/normalize";

function loadLocalEnv() {
  if (!existsSync(".env.local")) return;

  const lines = readFileSync(".env.local", "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed
      .slice(separatorIndex + 1)
      .trim()
      .replace(/^['"]|['"]$/g, "");

    process.env[key] ??= value;
  }
}

loadLocalEnv();

const secUserAgent = process.env.SEC_USER_AGENT;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
const offsetArg = process.argv.find((arg) => arg.startsWith("--offset="))?.split("=")[1];
const dryRun = process.argv.includes("--dry-run");
const limit = limitArg ? Number(limitArg) : 100;
const offset = offsetArg ? Number(offsetArg) : 0;

if (!secUserAgent) {
  throw new Error("SEC_USER_AGENT is required, for example FilingBox robin990083@gmail.com");
}

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

if (!Number.isInteger(limit) || limit <= 0) {
  throw new Error("--limit must be a positive integer.");
}

if (!Number.isInteger(offset) || offset < 0) {
  throw new Error("--offset must be a non-negative integer.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type SecTickerExchangeResponse = {
  fields: string[];
  data: Array<[number, string, string, string]>;
};

type CompanyUpsertRow = {
  id: string;
  market: "US";
  symbol: string;
  code: string | null;
  name: string;
  display_name: string;
  exchange: string;
  cik: string;
  org_id: null;
};

type ExistingCompanyRow = {
  id: string;
  symbol: string;
  name: string;
  display_name: string;
  exchange: string;
};

type AliasUpsertRow = {
  company_id: string;
  alias: string;
  language: "en";
  alias_type: "ticker" | "official_name" | "short_name";
  normalized_alias: string;
};

function companyId(symbol: string): string {
  return `us-${symbol.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function shortName(name: string): string {
  return name
    .replace(/\b(INC\.?|CORP\.?|CORPORATION|CO\.?|COMPANY|LTD\.?|PLC|CLASS A|CLASS B|COMMON STOCK)\b/gi, "")
    .replace(/[,\s]+$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function uniqueAliases(rows: AliasUpsertRow[]): AliasUpsertRow[] {
  const seen = new Set<string>();
  return rows.filter((row) => {
    const key = `${row.company_id}:${row.normalized_alias}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function fetchSecCompanies(): Promise<CompanyUpsertRow[]> {
  const response = await fetch("https://www.sec.gov/files/company_tickers_exchange.json", {
    headers: {
      "User-Agent": secUserAgent as string,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`SEC company list request failed ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as SecTickerExchangeResponse;

  return payload.data.slice(offset, offset + limit).map(([cik, name, symbol, exchange]) => ({
    id: companyId(symbol),
    market: "US",
    symbol: symbol.toUpperCase(),
    code: null,
    name,
    display_name: name,
    exchange,
    cik: String(cik).padStart(10, "0"),
    org_id: null,
  }));
}

async function mergeExistingCompanies(companies: CompanyUpsertRow[]): Promise<CompanyUpsertRow[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, symbol, name, display_name, exchange")
    .eq("market", "US");

  if (error) throw error;

  const existingBySymbol = new Map(
    ((data ?? []) as ExistingCompanyRow[]).map((company) => [company.symbol.toUpperCase(), company]),
  );

  return companies.map((company) => {
    const existing = existingBySymbol.get(company.symbol);
    if (!existing) return company;

    return {
      ...company,
      id: existing.id,
      name: existing.name || company.name,
      display_name: existing.display_name || company.display_name,
      exchange: existing.exchange || company.exchange,
    };
  });
}

function buildAliases(companies: CompanyUpsertRow[]): AliasUpsertRow[] {
  return uniqueAliases(
    companies.flatMap((company) => {
      const candidateShortName = shortName(company.name);
      const aliases: AliasUpsertRow[] = [
        {
          company_id: company.id,
          alias: company.symbol,
          language: "en",
          alias_type: "ticker",
          normalized_alias: normalizeQuery(company.symbol),
        },
        {
          company_id: company.id,
          alias: company.name,
          language: "en",
          alias_type: "official_name",
          normalized_alias: normalizeQuery(company.name),
        },
      ];

      if (candidateShortName && normalizeQuery(candidateShortName) !== normalizeQuery(company.name)) {
        aliases.push({
          company_id: company.id,
          alias: candidateShortName,
          language: "en",
          alias_type: "short_name",
          normalized_alias: normalizeQuery(candidateShortName),
        });
      }

      return aliases;
    }),
  );
}

async function main() {
  const companies = await mergeExistingCompanies(await fetchSecCompanies());
  const aliasRows = buildAliases(companies);

  if (dryRun) {
    console.log(
      `Dry run: would upsert ${companies.length} companies and ${aliasRows.length} aliases from offset ${offset}.`,
    );
    console.table(companies.slice(0, 10).map(({ symbol, name, exchange, cik }) => ({ symbol, name, exchange, cik })));
    return;
  }

  const { error: companyError } = await supabase
    .from("companies")
    .upsert(companies, { onConflict: "id" });
  if (companyError) throw companyError;

  const { error: aliasError } = await supabase
    .from("company_aliases")
    .upsert(aliasRows, { onConflict: "company_id,normalized_alias" });
  if (aliasError) throw aliasError;

  console.log(
    `SEC companies sync completed. Upserted ${companies.length} companies and ${aliasRows.length} aliases from offset ${offset}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
