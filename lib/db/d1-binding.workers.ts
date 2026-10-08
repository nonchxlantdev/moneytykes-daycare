import { env } from "cloudflare:workers";
import type { D1DatabaseLike } from "./d1-executor";

/**
 * Native D1 binding lookup — Cloudflare Workers implementation.
 * Selected by the alias in vite.config.ts; never imported by Next.js builds.
 * `DB` is the binding name in wrangler.jsonc → d1_databases.
 */
export function getD1Binding(): D1DatabaseLike | null {
  const db = (env as Record<string, unknown>).DB;
  return db ? (db as D1DatabaseLike) : null;
}
