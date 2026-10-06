import type { GatewayStatement, GatewayStatementResult } from "./gateway-protocol";

/**
 * Transport-agnostic SQL executor. The app talks to D1 through the
 * gateway Worker; tests use an in-memory SQLite executor with the exact
 * same migrations. Swapping to a native D1 binding (if hosting moves to
 * Cloudflare) means adding one more executor — repositories don't change.
 */
export interface SqlExecutor {
  execute(statement: GatewayStatement): Promise<GatewayStatementResult>;
  /** Must be atomic: all statements succeed or none are applied. */
  batch(statements: GatewayStatement[]): Promise<GatewayStatementResult[]>;
}

/** Internal database failure. The message is for server logs only — never shown to users. */
export class DatabaseError extends Error {
  constructor(
    message: string,
    readonly kind: "UNAVAILABLE" | "QUERY" | "CONSTRAINT",
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

/** Drizzle wraps driver errors in DrizzleQueryError (whose message contains SQL); find our DatabaseError in the cause chain. */
export function findDatabaseError(error: unknown): DatabaseError | undefined {
  let current: unknown = error;
  for (let depth = 0; current && depth < 5; depth++) {
    if (current instanceof DatabaseError) return current;
    current = current instanceof Error ? current.cause : undefined;
  }
  return undefined;
}

export function isUniqueViolation(error: unknown): boolean {
  return findDatabaseError(error)?.kind === "CONSTRAINT";
}

export function classifySqlError(message: string): DatabaseError {
  return new DatabaseError(message, /UNIQUE constraint failed|constraint failed/i.test(message) ? "CONSTRAINT" : "QUERY");
}
