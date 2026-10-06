/**
 * D1 gateway Worker.
 *
 * Cloudflare D1 is only reachable natively from Workers. This Worker is a
 * thin, authenticated SQL transport for the Next.js app hosted on Vercel:
 *
 *   - Only requests signed with GATEWAY_SECRET (HMAC-SHA256, 60s window) are accepted.
 *   - Schema-changing statements are refused (migrations use Wrangler).
 *   - Tenant isolation and RBAC are enforced in the Next.js service layer;
 *     the secret must therefore live ONLY on the Vercel server and here.
 */
import {
  GATEWAY_HEADER_SIGNATURE,
  GATEWAY_HEADER_TIMESTAMP,
  GATEWAY_MIN_SECRET_LENGTH,
  GATEWAY_QUERY_PATH,
  isForbiddenStatement,
  parseGatewayRequest,
  verifyGatewayRequest,
  type GatewayErrorCode,
  type GatewayResponse,
  type GatewayStatement,
  type GatewayStatementResult,
} from "../../../lib/db/gateway-protocol";

interface Env {
  DB: D1Database;
  GATEWAY_SECRET: string;
}

const MAX_BODY_BYTES = 256 * 1024;

function json(body: GatewayResponse | { ok: true; service: string }, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function fail(code: GatewayErrorCode, message: string, status: number): Response {
  return json({ ok: false, error: { code, message } }, status);
}

function bindParams(params: unknown[]): unknown[] {
  // D1 binds null/number/string; normalise booleans defensively.
  return params.map((p) => (typeof p === "boolean" ? (p ? 1 : 0) : p));
}

function prepare(env: Env, s: GatewayStatement): D1PreparedStatement {
  return env.DB.prepare(s.sql).bind(...bindParams(s.params));
}

async function runSingle(env: Env, s: GatewayStatement): Promise<GatewayStatementResult> {
  const stmt = prepare(env, s);
  if (s.method === "run") {
    await stmt.run();
    return { rows: [] };
  }
  const rows = await stmt.raw();
  return { rows: s.method === "get" ? (rows[0] ?? null) : rows };
}

async function runSequential(env: Env, statements: GatewayStatement[]): Promise<GatewayStatementResult[]> {
  const results: GatewayStatementResult[] = [];
  for (const s of statements) results.push(await runSingle(env, s));
  return results;
}

/** D1 batch is atomic (an implicit transaction). Batch results arrive as objects, so convert to value arrays. */
async function runBatch(env: Env, statements: GatewayStatement[]): Promise<GatewayStatementResult[]> {
  const results = await env.DB.batch(statements.map((s) => prepare(env, s)));
  return results.map((result, i) => {
    const method = statements[i].method;
    if (method === "run") return { rows: [] };
    const rows = (result.results ?? []).map((row) => Object.values(row as Record<string, unknown>));
    return { rows: method === "get" ? (rows[0] ?? null) : rows };
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET" && url.pathname === "/health") {
      return json({ ok: true, service: "daycare-d1-gateway" });
    }
    if (request.method !== "POST" || url.pathname !== GATEWAY_QUERY_PATH) {
      return fail("BAD_REQUEST", "Not found", 404);
    }
    if (!env.GATEWAY_SECRET || env.GATEWAY_SECRET.length < GATEWAY_MIN_SECRET_LENGTH) {
      return fail("INTERNAL", "Gateway is not configured", 500);
    }

    const length = Number(request.headers.get("content-length") ?? "0");
    if (length > MAX_BODY_BYTES) return fail("BAD_REQUEST", "Request too large", 413);
    const body = await request.text();
    if (body.length > MAX_BODY_BYTES) return fail("BAD_REQUEST", "Request too large", 413);

    const authorised = await verifyGatewayRequest(
      env.GATEWAY_SECRET,
      request.headers.get(GATEWAY_HEADER_TIMESTAMP),
      request.headers.get(GATEWAY_HEADER_SIGNATURE),
      body,
    );
    if (!authorised) return fail("UNAUTHORIZED", "Invalid or expired signature", 401);

    let parsed: unknown;
    try {
      parsed = JSON.parse(body);
    } catch {
      return fail("BAD_REQUEST", "Malformed JSON", 400);
    }
    const gatewayRequest = parseGatewayRequest(parsed);
    if (!gatewayRequest) return fail("BAD_REQUEST", "Invalid request shape", 400);
    if (gatewayRequest.statements.some((s) => isForbiddenStatement(s.sql))) {
      return fail("FORBIDDEN_STATEMENT", "Schema changes are not allowed through the gateway", 403);
    }

    try {
      const results =
        gatewayRequest.batch && gatewayRequest.statements.length > 1
          ? await runBatch(env, gatewayRequest.statements)
          : await runSequential(env, gatewayRequest.statements);
      return json({ ok: true, results });
    } catch (error) {
      // SQL errors go back to the trusted caller's server logs only; the app never shows them to users.
      const message = error instanceof Error ? error.message : String(error);
      return fail("SQL_ERROR", message, 400);
    }
  },
} satisfies ExportedHandler<Env>;
