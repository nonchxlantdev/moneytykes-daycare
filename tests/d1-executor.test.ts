import { describe, expect, it } from "vitest";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import { eq } from "drizzle-orm";
import { migrationStatements } from "./helpers/sqlite-executor";
import { createDb } from "@/lib/db/client";
import { createD1Executor, type D1DatabaseLike, type D1PreparedStatementLike } from "@/lib/db/d1-executor";
import { isUniqueViolation } from "@/lib/db/executor";
import { organizations } from "@/lib/db/schema";

/** A tiny stand-in for the Workers D1 binding API, backed by node:sqlite. */
function fakeD1(): D1DatabaseLike {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  for (const statement of migrationStatements()) sqlite.exec(statement);
  const prepare = (query: string, values: unknown[] = []): D1PreparedStatementLike & { _all(): Record<string, unknown>[] } => ({
    bind: (...v: unknown[]) => prepare(query, v),
    async run() {
      sqlite.prepare(query).run(...(values as SQLInputValue[]));
      return { success: true };
    },
    async raw<T>() {
      const stmt = sqlite.prepare(query);
      stmt.setReturnArrays(true);
      return stmt.all(...(values as SQLInputValue[])) as T[];
    },
    _all() {
      return sqlite.prepare(query).all(...(values as SQLInputValue[])) as Record<string, unknown>[];
    },
  });
  return {
    prepare: (q) => prepare(q),
    async batch(statements) {
      sqlite.exec("BEGIN");
      try {
        const out = statements.map((s) => ({ results: (s as ReturnType<typeof prepare>)._all() }));
        sqlite.exec("COMMIT");
        return out;
      } catch (e) {
        sqlite.exec("ROLLBACK");
        throw e;
      }
    },
  };
}

describe("native D1 executor", () => {
  it("runs Drizzle queries and atomic batches through a D1 binding", async () => {
    const db = createDb(createD1Executor(fakeD1()));
    await db.insert(organizations).values({ id: "o1", name: "My Daycare", slug: "mydaycare" });
    const [row] = await db.select().from(organizations);
    expect(row).toMatchObject({ id: "o1", slug: "mydaycare", status: "ACTIVE" });

    const [a, b] = await db.batch([
      db.select({ name: organizations.name }).from(organizations),
      db.update(organizations).set({ tagline: "Learn" }).where(organizationsIdIs("o1")),
    ]);
    expect(a).toEqual([{ name: "My Daycare" }]);
    expect(b).toBeDefined();
  });

  it("maps unique violations to CONSTRAINT errors", async () => {
    const db = createDb(createD1Executor(fakeD1()));
    await db.insert(organizations).values({ id: "o1", name: "A", slug: "dup" });
    const error = await db.insert(organizations).values({ id: "o2", name: "B", slug: "dup" }).catch((e: unknown) => e);
    expect(isUniqueViolation(error)).toBe(true);
  });
});

function organizationsIdIs(id: string) {
  return eq(organizations.id, id);
}
