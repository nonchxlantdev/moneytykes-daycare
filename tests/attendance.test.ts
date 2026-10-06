import { beforeEach, describe, expect, it } from "vitest";
import { and, eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { attendanceEvents, auditLogs } from "@/lib/db/schema";
import { deriveChildDay } from "@/lib/domain/attendance";
import { AppError } from "@/lib/server/errors";
import { listAttendanceWindow, recordAttendance } from "@/lib/server/services/attendance";
import type { TenantContext } from "@/lib/server/tenant-context";
import { contextFor, createOrg, type OrgFixture } from "./helpers/fixtures";
import { createTestDatabase } from "./helpers/sqlite-executor";

let db: AppDb;
let org: OrgFixture;
let owner: TenantContext;
const t0 = new Date("2026-10-06T14:15:00Z"); // 08:15 in Belize
const later = (min: number) => new Date(t0.getTime() + min * 60_000);
const code = (c: AppError["code"]) => (e: unknown) => e instanceof AppError && e.code === c;

beforeEach(async () => {
  db = createTestDatabase().db;
  org = await createOrg(db, "Little Stars Daycare", "1234");
  owner = await contextFor(db, org.orgId, "DAYCARE_OWNER");
});

const checkIn = (min = 0, extra: object = {}) =>
  recordAttendance(db, owner, "CHECK_IN", { childId: org.childId, guardianId: org.guardianId, clientEventId: crypto.randomUUID(), ...extra }, later(min));
const checkOut = (min = 0, extra: object = {}) =>
  recordAttendance(db, owner, "CHECK_OUT", { childId: org.childId, guardianId: org.guardianId, clientEventId: crypto.randomUUID(), ...extra }, later(min));

describe("attendance state machine", () => {
  it("allows CHECK_IN → CHECK_OUT → CHECK_IN → CHECK_OUT", async () => {
    await checkIn(0);
    await checkOut(240);
    await checkIn(250);
    await checkOut(480);
    const events = await listAttendanceWindow(db, owner, new Date(0));
    expect(events.map((e) => e.type)).toEqual(["CHECK_IN", "CHECK_OUT", "CHECK_IN", "CHECK_OUT"]);
  });

  it("rejects a second CHECK_IN without a CHECK_OUT", async () => {
    await checkIn(0);
    await expect(checkIn(5)).rejects.toSatisfy(code("ALREADY_CHECKED_IN"));
  });

  it("rejects CHECK_OUT when never checked in, and a second CHECK_OUT", async () => {
    await expect(checkOut(0)).rejects.toSatisfy(code("NOT_CHECKED_IN"));
    await checkIn(1);
    await checkOut(2);
    await expect(checkOut(3)).rejects.toSatisfy(code("ALREADY_CHECKED_OUT"));
  });

  it("derives current status from the latest event (no checked_in flag)", async () => {
    await checkIn(0);
    let events = await listAttendanceWindow(db, owner, new Date(0));
    expect(deriveChildDay(events, org.childId, later(60)).status).toBe("IN");
    await checkOut(60);
    events = await listAttendanceWindow(db, owner, new Date(0));
    const day = deriveChildDay(events, org.childId, later(90));
    expect(day.status).toBe("OUT");
    expect(day.durationMs).toBe(60 * 60_000);
  });

  it("is idempotent for a repeated clientEventId", async () => {
    const clientEventId = crypto.randomUUID();
    const first = await checkIn(0, { clientEventId });
    const retry = await checkIn(1, { clientEventId });
    expect(first.duplicate).toBe(false);
    expect(retry.duplicate).toBe(true);
    expect(retry.event.id).toBe(first.event.id);
    const rows = await db.select().from(attendanceEvents).where(eq(attendanceEvents.organizationId, org.orgId));
    expect(rows).toHaveLength(1);
  });

  it("refuses to reuse a clientEventId for a different action", async () => {
    const clientEventId = crypto.randomUUID();
    await checkIn(0, { clientEventId });
    await expect(checkOut(10, { clientEventId })).rejects.toSatisfy(code("CONFLICT"));
  });

  it("only lets authorized pickups check a child out", async () => {
    await checkIn(0);
    await expect(checkOut(30, { guardianId: org.emergencyOnlyGuardianId })).rejects.toSatisfy(code("FORBIDDEN"));
  });

  it("does not check in withdrawn children", async () => {
    await expect(
      recordAttendance(db, owner, "CHECK_IN", { childId: org.withdrawnChildId, clientEventId: crypto.randomUUID() }, t0),
    ).rejects.toSatisfy(code("INVALID_TRANSITION"));
  });

  it("stores UTC instants and writes an audit row per event", async () => {
    const res = await checkIn(0);
    expect(res.event.eventTime).toBe("2026-10-06T14:15:00.000Z");
    const audits = await db.select().from(auditLogs).where(and(eq(auditLogs.organizationId, org.orgId), eq(auditLogs.action, "ATTENDANCE_CHECK_IN")));
    expect(audits).toHaveLength(1);
    expect(audits[0].entityId).toBe(res.event.id);
    expect(audits[0].userId).toBe(owner.user.id);
  });

  it("does not write an audit row when the transition is rejected", async () => {
    await checkIn(0);
    await expect(checkIn(1)).rejects.toThrow();
    const audits = await db.select().from(auditLogs).where(eq(auditLogs.action, "ATTENDANCE_CHECK_IN"));
    expect(audits).toHaveLength(1);
  });

  it("validates input server-side", async () => {
    await expect(recordAttendance(db, owner, "CHECK_IN", { childId: "not-a-uuid", clientEventId: "x" })).rejects.toThrow();
  });

  it("lets only one of two simultaneous check-ins succeed", async () => {
    const results = await Promise.allSettled([checkIn(0), checkIn(0), checkIn(0)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rows = await db.select().from(attendanceEvents).where(eq(attendanceEvents.childId, org.childId));
    expect(rows).toHaveLength(1);
    const audits = await db.select().from(auditLogs).where(eq(auditLogs.action, "ATTENDANCE_CHECK_IN"));
    expect(audits).toHaveLength(1);
  });

  it("does not let a check-in left open yesterday block today's check-in", async () => {
    await checkIn(-24 * 60); // yesterday 08:15, never checked out
    await expect(checkOut(0)).rejects.toSatisfy(code("NOT_CHECKED_IN"));
    const today = await checkIn(0);
    expect(today.duplicate).toBe(false);
    await checkOut(60);
  });
});
