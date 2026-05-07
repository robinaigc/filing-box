import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

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
const limit = limitArg ? Number(limitArg) : 6;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

if (!Number.isInteger(limit) || limit <= 0) {
  throw new Error("--limit must be a positive integer.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type ReportRow = {
  id: string;
  company_id: string;
  filing_date: string;
};

async function main() {
  const { data, error } = await supabase
    .from("reports")
    .select("id, company_id, filing_date")
    .order("filing_date", { ascending: false });

  if (error) throw error;

  const seenCompanyIds = new Set<string>();
  const rows = ((data ?? []) as ReportRow[])
    .filter((report) => {
      if (seenCompanyIds.has(report.company_id)) return false;
      seenCompanyIds.add(report.company_id);
      return true;
    })
    .slice(0, limit)
    .map((report, index) => ({
      report_id: report.id,
      rank: index + 1,
    }));

  const { error: deleteError } = await supabase
    .from("recent_reports")
    .delete()
    .not("id", "is", null);

  if (deleteError) throw deleteError;

  const { error: insertError } = await supabase.from("recent_reports").insert(rows);
  if (insertError) throw insertError;

  console.log(`Rebuilt recent_reports with ${rows.length} reports.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
