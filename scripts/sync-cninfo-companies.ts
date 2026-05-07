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

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
const offsetArg = process.argv.find((arg) => arg.startsWith("--offset="))?.split("=")[1];
const symbolsArg = process.argv.find((arg) => arg.startsWith("--symbols="))?.split("=")[1];
const dryRun = process.argv.includes("--dry-run");
const limit = limitArg ? Number(limitArg) : 50;
const offset = offsetArg ? Number(offsetArg) : 0;

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

const defaultSymbols = [
  "600519",
  "300750",
  "300059",
  "002594",
  "600036",
  "000001",
  "000002",
  "000333",
  "000651",
  "000858",
  "000895",
  "000938",
  "000977",
  "001979",
  "002027",
  "002049",
  "002050",
  "002142",
  "002230",
  "002241",
  "002271",
  "002304",
  "002352",
  "002415",
  "002475",
  "002714",
  "002812",
  "300014",
  "300015",
  "300122",
  "300124",
  "300274",
  "300316",
  "300347",
  "300408",
  "300433",
  "300498",
  "300760",
  "300782",
  "600000",
  "600009",
  "600016",
  "600030",
  "600031",
  "600050",
  "600276",
  "600309",
  "600406",
  "600438",
  "600690",
  "600745",
  "600887",
  "600900",
  "601012",
  "601088",
  "601166",
  "601318",
  "601398",
  "601601",
  "601628",
  "601688",
  "601888",
  "601899",
  "601919",
  "603259",
  "603288",
  "603501",
  "603799",
  "603986",
  "688008",
  "688012",
  "688036",
  "688111",
  "688126",
  "688187",
  "688256",
  "688271",
  "688303",
  "688981",
];

type CninfoStock = {
  code: string;
  pinyin: string;
  category: string;
  orgId: string;
  zwjc: string;
};

type CninfoStockListResponse = {
  stockList: CninfoStock[];
};

type CompanyUpsertRow = {
  id: string;
  market: "CN";
  symbol: string;
  code: string;
  name: string;
  display_name: string;
  exchange: string;
  cik: null;
  org_id: string;
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
  language: "zh" | "en";
  alias_type: "code" | "short_name" | "common_name";
  normalized_alias: string;
};

function companyId(symbol: string): string {
  return `cn-${symbol}`;
}

function exchangeForSymbol(symbol: string): string {
  if (symbol.startsWith("6")) return "SSE";
  if (symbol.startsWith("8") || symbol.startsWith("4")) return "BJSE";
  return "SZSE";
}

function symbolsToImport(): string[] {
  const source = symbolsArg
    ? symbolsArg
        .split(",")
        .map((symbol) => symbol.trim())
        .filter(Boolean)
    : defaultSymbols;

  return source.slice(offset, offset + limit);
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

async function fetchCninfoStocks(): Promise<CninfoStock[]> {
  const response = await fetch("https://www.cninfo.com.cn/new/data/szse_stock.json", {
    headers: {
      "User-Agent": "Mozilla/5.0 FilingBox",
      Accept: "application/json",
      Referer: "https://www.cninfo.com.cn/",
    },
  });

  if (!response.ok) {
    throw new Error(`CNINFO stock list request failed ${response.status} ${response.statusText}`);
  }

  const payload = (await response.json()) as CninfoStockListResponse;
  return payload.stockList.filter((stock) => stock.category === "A股");
}

async function mergeExistingCompanies(companies: CompanyUpsertRow[]): Promise<CompanyUpsertRow[]> {
  const { data, error } = await supabase
    .from("companies")
    .select("id, symbol, name, display_name, exchange")
    .eq("market", "CN");

  if (error) throw error;

  const existingBySymbol = new Map(
    ((data ?? []) as ExistingCompanyRow[]).map((company) => [company.symbol, company]),
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

function buildCompanies(stocks: CninfoStock[], symbols: string[]): CompanyUpsertRow[] {
  const stockByCode = new Map(stocks.map((stock) => [stock.code, stock]));
  const missing: string[] = [];
  const companies: CompanyUpsertRow[] = [];

  for (const symbol of symbols) {
    const stock = stockByCode.get(symbol);
    if (!stock) {
      missing.push(symbol);
      continue;
    }

    companies.push({
      id: companyId(stock.code),
      market: "CN",
      symbol: stock.code,
      code: stock.code,
      name: stock.zwjc,
      display_name: stock.zwjc,
      exchange: exchangeForSymbol(stock.code),
      cik: null,
      org_id: stock.orgId,
    });
  }

  if (missing.length > 0) {
    console.warn(`CNINFO stock list missing symbols: ${missing.join(", ")}`);
  }

  return companies;
}

function buildAliases(companies: CompanyUpsertRow[]): AliasUpsertRow[] {
  return uniqueAliases(
    companies.flatMap((company) => {
      const aliases: AliasUpsertRow[] = [
        {
          company_id: company.id,
          alias: company.symbol,
          language: "zh",
          alias_type: "code",
          normalized_alias: normalizeQuery(company.symbol),
        },
        {
          company_id: company.id,
          alias: company.display_name,
          language: "zh",
          alias_type: "short_name",
          normalized_alias: normalizeQuery(company.display_name),
        },
      ];

      if (/[A-Za-z]/.test(company.display_name)) {
        aliases.push({
          company_id: company.id,
          alias: company.display_name.replace(/\s+/g, ""),
          language: "en",
          alias_type: "common_name",
          normalized_alias: normalizeQuery(company.display_name.replace(/\s+/g, "")),
        });
      }

      return aliases;
    }),
  );
}

async function main() {
  const symbols = symbolsToImport();
  const companies = await mergeExistingCompanies(buildCompanies(await fetchCninfoStocks(), symbols));
  const aliasRows = buildAliases(companies);

  if (dryRun) {
    console.log(
      `Dry run: would upsert ${companies.length} CN companies and ${aliasRows.length} aliases from offset ${offset}.`,
    );
    console.table(
      companies.slice(0, 10).map(({ symbol, display_name, exchange, org_id }) => ({
        symbol,
        display_name,
        exchange,
        org_id,
      })),
    );
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
    `CNINFO companies sync completed. Upserted ${companies.length} companies and ${aliasRows.length} aliases from offset ${offset}.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
