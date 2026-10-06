import { drizzle, type SqliteRemoteDatabase } from "drizzle-orm/sqlite-proxy";
import type { SqlExecutor } from "./executor";
import * as schema from "./schema";

export type AppDb = SqliteRemoteDatabase<typeof schema>;

/** Build a Drizzle client on top of any SqlExecutor (gateway in the app, in-memory SQLite in tests). */
export function createDb(executor: SqlExecutor): AppDb {
  return drizzle(
    async (sql, params, method) => {
      const { rows } = await executor.execute({ sql, params, method });
      return { rows: (rows ?? undefined) as unknown[] };
    },
    async (queries) => {
      const results = await executor.batch(queries);
      return results.map((r) => ({ rows: (r.rows ?? undefined) as unknown[] }));
    },
    { schema },
  );
}

export { schema };
