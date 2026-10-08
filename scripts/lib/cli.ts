/**
 * Shared helpers for the database CLIs (seed, create-tenant). Development
 * tooling only — never imported by the application.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

/** Repo root. wrangler.jsonc here owns the D1 binding ("DB") and migrations. */
export const ROOT = resolve(import.meta.dirname, "..", "..");

export function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const value = process.argv[i + 1];
  return value && !value.startsWith("--") ? value : "";
}

export function fail(message: string): never {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
}

/** Read .env.local (if present) so AUTH_EMAIL / SEED_* defaults work. Values are never printed. */
export function loadLocalEnv(): void {
  const envFile = join(ROOT, ".env.local");
  if (!existsSync(envFile)) return;
  try {
    process.loadEnvFile(envFile);
  } catch {
    console.warn("Could not read .env.local — continuing with flags and shell variables only.");
  }
}

/** Reads `database_name` from wrangler.jsonc (it contains no secrets). */
export function configuredDatabaseName(): string | undefined {
  const text = readFileSync(join(ROOT, "wrangler.jsonc"), "utf8");
  return /"database_name"\s*:\s*"([^"]+)"/.exec(text)?.[1];
}

export type Target = "local" | "remote";

export function readTarget(): Target {
  const target = (arg("target") ?? "local") as Target;
  if (target !== "local" && target !== "remote") fail(`--target must be "local" or "remote".`);
  return target;
}

/** Remote writes require naming the database explicitly: --confirm-remote daycare-db */
export function requireRemoteConfirmation(what: string, extraWarning = ""): void {
  const dbName = configuredDatabaseName();
  if (!dbName || arg("confirm-remote") !== dbName) {
    fail(
      `Refusing to ${what} on a REMOTE database without confirmation.\n` +
        `  Re-run with: --confirm-remote ${dbName ?? "<database_name>"}${extraWarning ? `\n  ${extraWarning}` : ""}`,
    );
  }
}

export function writeSqlFile(path: string, header: string, statements: string[]): string {
  const outFile = resolve(path);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, `-- ${header}\n${statements.join("\n")}\n`);
  console.log(`Wrote ${statements.length} statements to ${outFile}`);
  return outFile;
}

function quoteWindowsArg(value: string): string {
  if (!/[\s"]/.test(value)) return value;
  return `"${value.replace(/"/g, '\\"')}"`;
}

/** Execute a SQL file against the local (wrangler dev) or remote D1 database with Wrangler. */
export function executeSqlFile(target: Target, file: string): void {
  if (!existsSync(join(ROOT, "node_modules", "wrangler"))) fail("Install dependencies first: npm install");
  const wranglerArgs = ["wrangler", "d1", "execute", "DB", `--${target}`, `--file=${file}`];
  console.log(`Running: npx ${wranglerArgs.join(" ")}`);
  // shell is required to resolve npx on Windows, and cmd.exe splits unquoted paths.
  const spawnArgs = process.platform === "win32" ? wranglerArgs.map(quoteWindowsArg) : wranglerArgs;
  execFileSync(process.platform === "win32" ? "npx.cmd" : "npx", spawnArgs, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
}
