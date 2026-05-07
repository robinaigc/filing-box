import type { Company } from "@/lib/types";

export function isLikelyActiveCnCompanyName(name: string): boolean {
  const normalized = name.trim().toUpperCase();

  if (!normalized) return false;
  if (normalized.includes("退") || normalized.includes("退市")) return false;
  if (normalized.startsWith("PT") || normalized.includes("PT")) return false;

  return true;
}

export function isLikelyActiveCnCompany(company: Pick<Company, "market" | "displayName" | "name">) {
  if (company.market !== "CN") return true;
  return isLikelyActiveCnCompanyName(company.displayName || company.name);
}
