/**
 * Wire protocol shared by the Next.js server (client) and the Cloudflare
 * D1 gateway Worker (server). Pure Web Crypto — runs in Node 20+, the
 * Vercel runtime and Workers alike. Keep this file dependency-free.
 *
 * Every request is authenticated with an HMAC-SHA256 signature over
 * `${timestamp}.${body}` using a shared secret that only the Vercel
 * server and the Worker know. Requests older than the tolerance window
 * are rejected to limit replay.
 */

export type StatementMethod = "run" | "all" | "values" | "get";

export interface GatewayStatement {
  sql: string;
  params: unknown[];
  method: StatementMethod;
}

export interface GatewayRequest {
  /** Executed atomically (D1 batch) when more than one statement is sent with `batch: true`. */
  batch: boolean;
  statements: GatewayStatement[];
}

export interface GatewayStatementResult {
  /** `get`: a single row (array of column values) or null. `all`/`values`: array of rows. `run`: []. */
  rows: unknown[] | unknown[][] | null;
}

export type GatewayResponse =
  | { ok: true; results: GatewayStatementResult[] }
  | { ok: false; error: { code: GatewayErrorCode; message: string } };

export type GatewayErrorCode = "UNAUTHORIZED" | "BAD_REQUEST" | "FORBIDDEN_STATEMENT" | "SQL_ERROR" | "INTERNAL";

export const GATEWAY_HEADER_TIMESTAMP = "x-vf-timestamp";
export const GATEWAY_HEADER_SIGNATURE = "x-vf-signature";
export const GATEWAY_QUERY_PATH = "/v1/query";
export const GATEWAY_TOLERANCE_MS = 60_000;
export const GATEWAY_MAX_STATEMENTS = 50;
export const GATEWAY_MIN_SECRET_LENGTH = 32;

/**
 * Schema changes go through `wrangler d1 migrations apply`, never through
 * the gateway. Defense in depth: refuse DDL and engine-level statements.
 */
const FORBIDDEN_LEADING_KEYWORDS = /^\s*(create|drop|alter|pragma|attach|detach|vacuum|reindex)\b/i;

export function isForbiddenStatement(sql: string): boolean {
  return FORBIDDEN_LEADING_KEYWORDS.test(sql);
}

const encoder = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function fromHex(hex: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[0-9a-f]+$/i.test(hex) || hex.length % 2 !== 0) return null;
  const out = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

export async function signGatewayRequest(secret: string, timestamp: string, body: string): Promise<string> {
  const key = await hmacKey(secret);
  return toHex(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`)));
}

/** Constant-time verification (crypto.subtle.verify) plus a freshness check. */
export async function verifyGatewayRequest(
  secret: string,
  timestamp: string | null,
  signature: string | null,
  body: string,
  now: number = Date.now(),
  toleranceMs: number = GATEWAY_TOLERANCE_MS,
): Promise<boolean> {
  if (!timestamp || !signature) return false;
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(now - ts) > toleranceMs) return false;
  const sig = fromHex(signature);
  if (!sig) return false;
  const key = await hmacKey(secret);
  return crypto.subtle.verify("HMAC", key, sig, encoder.encode(`${timestamp}.${body}`));
}

/** Runtime validation of an incoming request body (the Worker can't trust its caller's shape). */
export function parseGatewayRequest(value: unknown): GatewayRequest | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.batch !== "boolean" || !Array.isArray(v.statements)) return null;
  if (v.statements.length === 0 || v.statements.length > GATEWAY_MAX_STATEMENTS) return null;
  const statements: GatewayStatement[] = [];
  for (const s of v.statements) {
    if (!s || typeof s !== "object") return null;
    const st = s as Record<string, unknown>;
    if (typeof st.sql !== "string" || !Array.isArray(st.params)) return null;
    if (st.method !== "run" && st.method !== "all" && st.method !== "values" && st.method !== "get") return null;
    for (const p of st.params) {
      if (p !== null && typeof p !== "string" && typeof p !== "number" && typeof p !== "boolean") return null;
    }
    statements.push({ sql: st.sql, params: st.params, method: st.method });
  }
  return { batch: v.batch, statements };
}
