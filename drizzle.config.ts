import { defineConfig } from "drizzle-kit";

/**
 * Drizzle Kit is used ONLY to generate SQL migration files from the
 * schema (`npm run db:generate`). Migrations are committed to git and
 * applied explicitly with Wrangler (see docs/CLOUDFLARE_SETUP.md).
 * There is no `push`/auto-sync against any database.
 */
export default defineConfig({
  dialect: "sqlite",
  schema: "./lib/db/schema/index.ts",
  out: "./drizzle/migrations",
  strict: true,
  verbose: true,
});
