import { describe, expect, it } from "vitest";
import { isForbiddenStatement, parseGatewayRequest, signGatewayRequest, verifyGatewayRequest } from "@/lib/db/gateway-protocol";
import { addDays, zonedStartOfDay, zonedTimeToUtc } from "@/lib/utils/timezone";
import { readMigrationFiles } from "./helpers/sqlite-executor";

const SECRET = "test-secret-0123456789abcdef0123456789";

describe("gateway request signing", () => {
  it("accepts a fresh, correctly signed request", async () => {
    const ts = String(Date.now());
    const sig = await signGatewayRequest(SECRET, ts, "{}");
    expect(await verifyGatewayRequest(SECRET, ts, sig, "{}")).toBe(true);
  });

  it("rejects tampered bodies, wrong secrets, stale timestamps and missing headers", async () => {
    const ts = String(Date.now());
    const sig = await signGatewayRequest(SECRET, ts, '{"a":1}');
    expect(await verifyGatewayRequest(SECRET, ts, sig, '{"a":2}')).toBe(false);
    expect(await verifyGatewayRequest(SECRET + "x", ts, sig, '{"a":1}')).toBe(false);
    const old = String(Date.now() - 5 * 60_000);
    expect(await verifyGatewayRequest(SECRET, old, await signGatewayRequest(SECRET, old, "{}"), "{}")).toBe(false);
    expect(await verifyGatewayRequest(SECRET, null, sig, "{}")).toBe(false);
  });

  it("refuses schema-changing statements and malformed requests", () => {
    expect(isForbiddenStatement("DROP TABLE children")).toBe(true);
    expect(isForbiddenStatement("  pragma table_info(x)")).toBe(true);
    expect(isForbiddenStatement("SELECT * FROM children")).toBe(false);
    expect(parseGatewayRequest({ batch: false, statements: [] })).toBeNull();
    expect(parseGatewayRequest({ batch: false, statements: [{ sql: "select 1", params: [{}], method: "all" }] })).toBeNull();
  });
});

describe("timezone handling", () => {
  it("computes the UTC instant of local midnight in the organization's timezone", () => {
    expect(zonedStartOfDay("2026-10-06", "America/Belize").toISOString()).toBe("2026-10-06T06:00:00.000Z");
    expect(zonedTimeToUtc("2026-07-01", "08:15", "America/New_York").toISOString()).toBe("2026-07-01T12:15:00.000Z");
    expect(zonedTimeToUtc("2026-01-15", "08:15", "America/New_York").toISOString()).toBe("2026-01-15T13:15:00.000Z");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("migrations", () => {
  it("are committed SQL files", () => {
    expect(readMigrationFiles().length).toBeGreaterThan(0);
  });
});
