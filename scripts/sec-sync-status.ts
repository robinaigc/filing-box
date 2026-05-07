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
const statusArg = process.argv.find((arg) => arg.startsWith("--status="))?.split("=")[1];
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
const limit = limitArg ? Number(limitArg) : 20;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.");
}

if (statusArg && !["success", "empty", "failed"].includes(statusArg)) {
  throw new Error("--status must be one of success, empty, failed.");
}

if (!Number.isInteger(limit) || limit <= 0) {
  throw new Error("--limit must be a positive integer.");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

type SyncRunRow = {
  symbol: string;
  cik: string | null;
  status: "success" | "empty" | "failed";
  synced_count: number;
  error_message: string | null;
  offset_value: number | null;
  limit_value: number | null;
  finished_at: string;
};

async function countStatus(status: SyncRunRow["status"]): Promise<number> {
  const { count, error } = await supabase
    .from("sec_sync_runs")
    .select("id", { count: "exact", head: true })
    .eq("status", status);

  if (error) throw error;
  return count ?? 0;
}

async function main() {
  const [success, empty, failed] = await Promise.all([
    countStatus("success"),
    countStatus("empty"),
    countStatus("failed"),
  ]);

  console.log(
    JSON.stringify(
      {
        totals: {
          success,
          empty,
          failed,
          all: success + empty + failed,
        },
      },
      null,
      2,
    ),
  );

  let query = supabase
    .from("sec_sync_runs")
    .select("symbol, cik, status, synced_count, error_message, offset_value, limit_value, finished_at")
    .order("finished_at", { ascending: false })
    .limit(limit);

  if (statusArg) {
    query = query.eq("status", statusArg);
  }

  const { data, error } = await query;
  if (error) throw error;

  console.table(
    ((data ?? []) as SyncRunRow[]).map((row) => ({
      symbol: row.symbol,
      status: row.status,
      count: row.synced_count,
      offset: row.offset_value,
      limit: row.limit_value,
      finishedAt: row.finished_at,
      error: row.error_message ?? "",
    })),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
