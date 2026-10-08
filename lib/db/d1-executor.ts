import { classifySqlError, DatabaseError, type SqlExecutor } from "./executor";
import type { GatewayStatement, GatewayStatementResult } from "./gateway-protocol";

/**
 * Minimal structural types for a Cloudflare D1 binding, so this file
 * compiles in the Next.js/Vitest TypeScript project without pulling in the
 * full Workers type package.
 */
export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  run(): Promise<unknown>;
  raw<T = unknown[]>(): Promise<T[]>;
}
export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch(statements: D1PreparedStatementLike[]): Promise<Array<{ results?: unknown[] }>>;
}

/** D1 binds null/number/string/ArrayBuffer — normalise booleans defensively. */
function bindParams(params: unknown[]): unknown[] {
  return params.map((p) => (typeof p === "boolean" ? (p ? 1 : 0) : p));
}

const TRANSIENT = /overloaded|unavailable|timed? ?out|network connection lost|internal error|reset/i;

function toDatabaseError(error: unknown): DatabaseError {
  if (error instanceof DatabaseError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (TRANSIENT.test(message) && !/constraint/i.test(message)) return new DatabaseError(message, "UNAVAILABLE");
  return classifySqlError(message);
}

/**
 * SqlExecutor backed by a native D1 binding. Used by the application when it
 * runs on Cloudflare Workers, and by the D1 gateway Worker that the Vercel
 * deployment still uses during the migration. Same result shapes as the
 * gateway protocol, so Drizzle and every repository work unchanged.
 */
export function createD1Executor(db: D1DatabaseLike): SqlExecutor {
  const prepare = (s: GatewayStatement) => db.prepare(s.sql).bind(...bindParams(s.params));

  const runSingle = async (s: GatewayStatement): Promise<GatewayStatementResult> => {
    const stmt = prepare(s);
    if (s.method === "run") {
      await stmt.run();
      return { rows: [] };
    }
    const rows = await stmt.raw<unknown[]>();
    return { rows: s.method === "get" ? (rows[0] ?? null) : rows };
  };

  return {
    async execute(statement) {
      try {
        return await runSingle(statement);
      } catch (error) {
        throw toDatabaseError(error);
      }
    },
    /**
     * D1 batches are atomic (one implicit transaction). Batch results come back
     * as row objects, so they are converted to value arrays in column order.
     * Statements in a batch must therefore not select duplicate column names
     * (the repositories' batched selects are single-table).
     */
    async batch(statements) {
      if (statements.length === 0) return [];
      if (statements.length === 1) return [await this.execute(statements[0])];
      try {
        const results = await db.batch(statements.map(prepare));
        return results.map((result, i) => {
          const method = statements[i].method;
          if (method === "run") return { rows: [] };
          const rows = (result.results ?? []).map((row) => Object.values(row as Record<string, unknown>));
          return { rows: method === "get" ? (rows[0] ?? null) : rows };
        });
      } catch (error) {
        throw toDatabaseError(error);
      }
    },
  };
}
