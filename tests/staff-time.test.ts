import { beforeEach, describe, expect, it } from "vitest";
import type { AppDb } from "@/lib/db/client";
import { deriveStaffDay } from "@/lib/domain/staff-time";
import { AppError } from "@/lib/server/errors";
import { createStaff, listStaff, updateStaff } from "@/lib/server/services/staff";
import { listStaffTimeWindow, recordStaffTime, verifyStaffPin } from "@/lib/server/services/staff-time";
import type { TenantContext } from "@/lib/server/tenant-context";
import { contextFor, createOrg, type OrgFixture } from "./helpers/fixtures";
import { createTestDatabase } from "./helpers/sqlite-executor";

let db: AppDb;
let org: OrgFixture;
let owner: TenantContext;
const t0 = new Date("2026-10-06T13:45:00Z");
const code = (c: AppError["code"]) => (e: unknown) => e instanceof AppError && e.code === c;
const clock = (type: "CLOCK_IN" | "CLOCK_OUT", min: number, pin = org.staffPin) =>
  recordStaffTime(db, owner, type, { pin, clientEventId: crypto.randomUUID() }, new Date(t0.getTime() + min * 60_000));

beforeEach(async () => {
  db = createTestDatabase().db;
  org = await createOrg(db, "Little Stars Daycare", "1234");
  owner = await contextFor(db, org.orgId, "DAYCARE_OWNER");
});

describe("staff time clock", () => {
  it("clocks in, rejects a second clock-in, then clocks out", async () => {
    const first = await clock("CLOCK_IN", 0);
    expect(first.staff.id).toBe(org.staffId);
    await expect(clock("CLOCK_IN", 5)).rejects.toSatisfy(code("ALREADY_CLOCKED_IN"));
    await clock("CLOCK_OUT", 480);
    await expect(clock("CLOCK_OUT", 481)).rejects.toSatisfy(code("NOT_CLOCKED_IN"));
    const events = await listStaffTimeWindow(db, owner, new Date(0));
    const staff = (await listStaff(db, owner))[0];
    const day = deriveStaffDay(staff, events, "2026-10-06", "America/Belize", new Date(t0.getTime() + 600 * 60_000));
    expect(day.status).toBe("OFF_DUTY");
    expect(day.workedMs).toBe(480 * 60_000);
  });

  it("rejects unknown PINs", async () => {
    await expect(clock("CLOCK_IN", 0, "9999")).rejects.toSatisfy(code("INVALID_PIN"));
    await expect(verifyStaffPin(db, owner, { pin: "9999" })).rejects.toSatisfy(code("INVALID_PIN"));
  });

  it("verifies a PIN and reports duty state without exposing the hash", async () => {
    const result = await verifyStaffPin(db, owner, { pin: org.staffPin });
    expect(result.onDuty).toBe(false);
    expect(result.staff.hasPin).toBe(true);
    expect(JSON.stringify(result)).not.toContain("$2");
  });

  it("creates staff with a hashed, unique PIN", async () => {
    await expect(
      createStaff(db, owner, { firstName: "Mike", lastName: "Carter", jobTitle: "Assistant", employmentStatus: "ACTIVE", pin: org.staffPin }),
    ).rejects.toSatisfy(code("VALIDATION"));
    const { id } = await createStaff(db, owner, { firstName: "Mike", lastName: "Carter", jobTitle: "Assistant", employmentStatus: "ACTIVE", pin: "2345" });
    const res = await clock("CLOCK_IN", 0, "2345");
    expect(res.staff.id).toBe(id);
  });

  it("does not let staff on leave clock in", async () => {
    await updateStaff(db, owner, { staffId: org.staffId, employmentStatus: "ON_LEAVE", statusNote: "Sick Leave" });
    await expect(clock("CLOCK_IN", 0)).rejects.toSatisfy(code("INVALID_TRANSITION"));
  });

  it("is idempotent and treats a shift left open yesterday as closed", async () => {
    const id = crypto.randomUUID();
    const a = await recordStaffTime(db, owner, "CLOCK_IN", { pin: org.staffPin, clientEventId: id }, new Date(t0.getTime() - 24 * 3_600_000));
    const b = await recordStaffTime(db, owner, "CLOCK_IN", { pin: org.staffPin, clientEventId: id }, new Date(t0.getTime() - 24 * 3_600_000));
    expect(b.duplicate).toBe(true);
    expect(b.event.id).toBe(a.event.id);
    // Never clocked out yesterday — today's clock-in still works.
    const verified = await verifyStaffPin(db, owner, { pin: org.staffPin }, t0);
    expect(verified.onDuty).toBe(false);
    await clock("CLOCK_IN", 0);
  });
});

