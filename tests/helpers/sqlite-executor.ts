/**
 * In-memory SQLite executor for tests. Applies the SAME committed Drizzle
 * migrations that production D1 uses, and mirrors the gateway's result
 * shapes (raw value arrays, atomic batches) so services run unchanged.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { classifySqlError, type SqlExecutor } from "@/lib/db/executor";
import { createDb, type AppDb } from "@/lib/db/client";
import type { GatewayStatement, GatewayStatementResult } from "@/lib/db/gateway-protocol";

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "..", "drizzle", "migrations");

export function createTestDatabase(): { db: AppDb; sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;"); // D1 enforces foreign keys
  for (const statement of migrationStatements()) sqlite.exec(statement);

  const bind = (params: unknown[]): SQLInputValue[] =>
    params.map((p) => (typeof p === "boolean" ? (p ? 1 : 0) : (p as SQLInputValue)));

  const run = (s: GatewayStatement): GatewayStatementResult => {
    try {
      const stmt = sqlite.prepare(s.sql);
      stmt.setReturnArrays(true);
      if (s.method === "run") {
        stmt.run(...bind(s.params));
        return { rows: [] };
      }
      if (s.method === "get") return { rows: (stmt.get(...bind(s.params)) as unknown[] | undefined) ?? null };
      return { rows: stmt.all(...bind(s.params)) as unknown as unknown[][] };
    } catch (error) {
      throw classifySqlError(error instanceof Error ? error.message : String(error));
    }
  };

  const executor: SqlExecutor = {
    async execute(statement) {
      return run(statement);
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const results = statements.map(run);
        sqlite.exec("COMMIT");
        return results;
      } catch (error) {
        sqlite.exec("ROLLBACK");
        throw error;
      }
    },
  };
  return { db: createDb(executor), sqlite };
}

export function readMigrationFiles(): string[] {
  return readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith(".sql"));
}

/** Every statement of every committed migration, in order. */
export function migrationStatements(): string[] {
  return readMigrationFiles()
    .sort()
    .flatMap((file) => readFileSync(join(MIGRATIONS_DIR, file), "utf8").split("--> statement-breakpoint"))
    .filter((statement) => statement.trim());
}
