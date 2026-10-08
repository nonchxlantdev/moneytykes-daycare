import "server-only";

import { createDb, type AppDb } from "./client";
import { getD1Binding } from "./d1-binding";
import { createD1Executor } from "./d1-executor";
import { DatabaseError } from "./executor";
import { createGatewayExecutor } from "./gateway-executor";

let db: AppDb | undefined;

/**
 * The application's database handle (server-only).
 *
 * Cloudflare Workers (production target):
 *   Worker ──native D1 binding "DB"──▶ Cloudflare D1
 *
 * Vercel / `next dev` (temporary, until Vercel is retired):
 *   Next.js server ──HMAC-signed HTTPS──▶ D1 gateway Worker ──binding──▶ Cloudflare D1
 *
 * Never import this from client components. Pages and actions go through
 * services (lib/server/services), which enforce tenant + role checks.
 */
export function getDb(): AppDb {
  if (db) return db;

  const binding = getD1Binding();
  if (binding) {
    db = createDb(createD1Executor(binding));
    return db;
  }

  const url = process.env.D1_GATEWAY_URL?.trim();
  const secret = process.env.D1_GATEWAY_SECRET?.trim();
  if (!url || !secret) {
    throw new DatabaseError("No D1 binding and D1_GATEWAY_URL / D1_GATEWAY_SECRET are not set", "UNAVAILABLE");
  }
  db = createDb(createGatewayExecutor(url, secret));
  return db;
}

export type { AppDb };
