export type Market = "US" | "CN";

export type Company = {
  id: string;
  market: Market;
  symbol: string;
  code?: string;
  name: string;
  displayName: string;
  exchange: string;
  cik?: string;
  orgId?: string;
};

export type CompanyAlias = {
  companyId: string;
  alias: string;
  language: "en" | "zh";
  aliasType: "ticker" | "code" | "official_name" | "short_name" | "common_name";
};

export type Report = {
  id: string;
  companyId: string;
  companyName: string;
  market: Market;
  symbol: string;
  exchange: string;
  reportType: string;
  period: "FY" | "Q1" | "Q2" | "Q3" | "H1" | "OTHER";
  year: number;
  filingDate: string;
  title: string;
  source: "SEC" | "CNINFO" | "MOCK";
  sourceUrl: string;
  downloadUrl: string;
};
