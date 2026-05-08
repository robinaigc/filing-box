import { spawn } from "node:child_process";

const offsetArg = process.argv.find((arg) => arg.startsWith("--offset="))?.split("=")[1];
const batchesArg = process.argv.find((arg) => arg.startsWith("--batches="))?.split("=")[1];
const batchSizeArg = process.argv.find((arg) => arg.startsWith("--batch-size="))?.split("=")[1];
const pauseMsArg = process.argv.find((arg) => arg.startsWith("--pause-ms="))?.split("=")[1];
const includeInactive = process.argv.includes("--include-inactive");
const dryRun = process.argv.includes("--dry-run");

const offset = offsetArg ? Number(offsetArg) : 800;
const batches = batchesArg ? Number(batchesArg) : 5;
const batchSize = batchSizeArg ? Number(batchSizeArg) : 100;
const pauseMs = pauseMsArg ? Number(pauseMsArg) : 5000;

if (!Number.isInteger(offset) || offset < 0) {
  throw new Error("--offset must be a non-negative integer.");
}

if (!Number.isInteger(batches) || batches <= 0) {
  throw new Error("--batches must be a positive integer.");
}

if (!Number.isInteger(batchSize) || batchSize <= 0) {
  throw new Error("--batch-size must be a positive integer.");
}

if (!Number.isInteger(pauseMs) || pauseMs < 0) {
  throw new Error("--pause-ms must be a non-negative integer.");
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runCommand(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const childCommand =
      process.platform === "win32"
        ? (process.env.ComSpec ?? "C:\\Windows\\System32\\cmd.exe")
        : command;
    const childArgs =
      process.platform === "win32" ? ["/d", "/s", "/c", command, ...args] : args;

    const child = spawn(childCommand, childArgs, {
      shell: false,
      stdio: "inherit",
      windowsHide: true,
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

async function runCninfoBatch(batchOffset: number) {
  const args = [
    "run",
    "sync:cninfo",
    "--",
    `--offset=${batchOffset}`,
    `--limit=${batchSize}`,
  ];

  if (includeInactive) {
    args.push("--include-inactive");
  }

  console.log(`\n[CNINFO batch] offset=${batchOffset} limit=${batchSize}`);

  if (dryRun) {
    console.log(`Dry run: npm.cmd ${args.join(" ")}`);
    return;
  }

  await runCommand("npm.cmd", args);
}

async function main() {
  console.log(
    JSON.stringify(
      {
        offset,
        batches,
        batchSize,
        pauseMs,
        includeInactive,
        dryRun,
      },
      null,
      2,
    ),
  );

  for (let index = 0; index < batches; index += 1) {
    await runCninfoBatch(offset + index * batchSize);

    if (index < batches - 1 && pauseMs > 0) {
      console.log(`[CNINFO batch] pause ${pauseMs}ms`);
      await sleep(pauseMs);
    }
  }

  if (dryRun) return;

  console.log("\n[CNINFO batch] rebuilding recent reports");
  await runCommand("npm.cmd", ["run", "db:recent:rebuild"]);

  console.log("\n[CNINFO batch] coverage summary");
  await runCommand("npm.cmd", ["run", "sync:cninfo:coverage", "--", "--limit=10"]);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
