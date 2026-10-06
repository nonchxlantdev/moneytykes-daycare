import "server-only";

import { createDb, type AppDb } from "./client";
import { DatabaseError } from "./executor";
import { createGatewayExecutor } from "./gateway-executor";

let db: AppDb | undefined;

/**
 * The application's database handle (server-only).
 *
 *   Next.js server (Vercel)  ──HMAC-signed HTTPS──▶  D1 gateway Worker  ──binding──▶  Cloudflare D1
 *
 * Never import this from client components. Pages and actions go through
 * services (lib/server/services), which enforce tenant + role checks.
 */
export function getDb(): AppDb {
  if (db) return db;
  const url = process.env.D1_GATEWAY_URL?.trim();
  const secret = process.env.D1_GATEWAY_SECRET?.trim();
  if (!url || !secret) {
    throw new DatabaseError("D1_GATEWAY_URL and D1_GATEWAY_SECRET must be set", "UNAVAILABLE");
  }
  db = createDb(createGatewayExecutor(url, secret));
  return db;
}

export type { AppDb };
