import type { SqlExecutor } from "./executor";
import { DatabaseError, classifySqlError } from "./executor";
import {
  GATEWAY_HEADER_SIGNATURE,
  GATEWAY_HEADER_TIMESTAMP,
  GATEWAY_MIN_SECRET_LENGTH,
  GATEWAY_QUERY_PATH,
  signGatewayRequest,
  type GatewayRequest,
  type GatewayResponse,
  type GatewayStatement,
  type GatewayStatementResult,
} from "./gateway-protocol";

const REQUEST_TIMEOUT_MS = 10_000;

/** Executes SQL against D1 via the authenticated Cloudflare Worker gateway. Server-side only. */
export function createGatewayExecutor(baseUrl: string, secret: string): SqlExecutor {
  if (secret.length < GATEWAY_MIN_SECRET_LENGTH) {
    throw new DatabaseError("D1_GATEWAY_SECRET must be at least 32 characters", "UNAVAILABLE");
  }
  const url = new URL(GATEWAY_QUERY_PATH, baseUrl).toString();

  async function send(request: GatewayRequest): Promise<GatewayStatementResult[]> {
    const body = JSON.stringify(request);
    const timestamp = String(Date.now());
    const signature = await signGatewayRequest(secret, timestamp, body);
    let response: Response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [GATEWAY_HEADER_TIMESTAMP]: timestamp,
          [GATEWAY_HEADER_SIGNATURE]: signature,
        },
        body,
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      throw new DatabaseError(`D1 gateway unreachable: ${error instanceof Error ? error.message : String(error)}`, "UNAVAILABLE");
    }

    let payload: GatewayResponse;
    try {
      payload = (await response.json()) as GatewayResponse;
    } catch {
      throw new DatabaseError(`D1 gateway returned a non-JSON response (HTTP ${response.status})`, "UNAVAILABLE");
    }
    if (!payload.ok) {
      if (payload.error.code === "SQL_ERROR") throw classifySqlError(payload.error.message);
      throw new DatabaseError(`D1 gateway error ${payload.error.code}: ${payload.error.message}`, response.status >= 500 || response.status === 401 ? "UNAVAILABLE" : "QUERY");
    }
    return payload.results;
  }

  return {
    async execute(statement: GatewayStatement) {
      const [result] = await send({ batch: false, statements: [statement] });
      return result;
    },
    batch(statements: GatewayStatement[]) {
      return send({ batch: true, statements });
    },
  };
}
