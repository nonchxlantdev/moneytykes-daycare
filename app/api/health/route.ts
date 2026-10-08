import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { isDemoDataMode } from "@/lib/demo-data/mode";

/**
 * Deployment health check (public, no tenant data):
 *   GET /api/health → {"ok":true,"database":"ok"|"demo","runtime":"workers"|"node"}
 * Used to verify a Cloudflare deployment and its D1 binding.
 */
export async function GET() {
  const runtime = typeof navigator !== "undefined" && navigator.userAgent === "Cloudflare-Workers" ? "workers" : "node";
  if (isDemoDataMode()) {
    return Response.json({ ok: true, database: "demo", runtime }, { headers: { "cache-control": "no-store" } });
  }
  try {
    await getDb().run(sql`select 1`);
    return Response.json({ ok: true, database: "ok", runtime }, { headers: { "cache-control": "no-store" } });
  } catch {
    // Details go to server logs only (see lib/db); never to the response.
    return Response.json({ ok: false, database: "unavailable", runtime }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
