import { beforeEach, describe, expect, it } from "vitest";
import type { AppDb } from "@/lib/db/client";
import { AppError } from "@/lib/server/errors";
import { recordAttendance } from "@/lib/server/services/attendance";
import { getChildProfile, listChildRecords, setChildStatus, updateChild } from "@/lib/server/services/children";
import { linkGuardian, updateGuardian } from "@/lib/server/services/guardians";
import { getStaffMember, listStaff, updateStaff } from "@/lib/server/services/staff";
import { recordStaffTime } from "@/lib/server/services/staff-time";
import { resolveTenantContext, type TenantContext } from "@/lib/server/tenant-context";
import { contextFor, createOrg, type OrgFixture } from "./helpers/fixtures";
import { createTestDatabase } from "./helpers/sqlite-executor";

/**
 * Two organizations in one database. Every service call is made with an
 * Organization A context against Organization B's record IDs — the kind
 * of IDs an attacker could paste into a request.
 */
let db: AppDb;
let a: OrgFixture;
let b: OrgFixture;
let ownerA: TenantContext;

async function expectCode(promise: Promise<unknown>, code: AppError["code"]) {
  await expect(promise).rejects.toSatisfy((e: unknown) => e instanceof AppError && e.code === code);
}

beforeEach(async () => {
  db = createTestDatabase().db;
  a = await createOrg(db, "Little Stars Daycare", "1234");
  b = await createOrg(db, "Happy Kids Preschool", "5678");
  ownerA = await contextFor(db, a.orgId, "DAYCARE_OWNER");
});

describe("tenant resolution", () => {
  it("derives the organization from the authenticated identity's membership", () => {
    expect(ownerA.organizationId).toBe(a.orgId);
    expect(ownerA.role).toBe("DAYCARE_OWNER");
  });

  it("rejects unauthenticated requests", async () => {
    await expectCode(resolveTenantContext(db, null), "UNAUTHENTICATED");
  });

  it("rejects identities without a user/membership", async () => {
    await expectCode(resolveTenantContext(db, "password:someone-else"), "FORBIDDEN");
  });
});

describe("Organization A cannot touch Organization B", () => {
  it("cannot read a child from B", async () => {
    expect(await getChildProfile(db, ownerA, b.childId)).toBeNull();
    const ids = (await listChildRecords(db, ownerA)).map((c) => c.id);
    expect(ids).toContain(a.childId);
    expect(ids).not.toContain(b.childId);
  });

  it("cannot update a child from B", async () => {
    await expectCode(updateChild(db, ownerA, { childId: b.childId, firstName: "Hacked" }), "NOT_FOUND");
    await expectCode(setChildStatus(db, ownerA, { childId: b.childId, enrollmentStatus: "WITHDRAWN" }), "NOT_FOUND");
    const ownerB = await contextFor(db, b.orgId, "DAYCARE_OWNER");
    expect((await getChildProfile(db, ownerB, b.childId))?.firstName).toBe("Amari");
  });

  it("cannot check in a child from B", async () => {
    await expectCode(recordAttendance(db, ownerA, "CHECK_IN", { childId: b.childId, clientEventId: crypto.randomUUID() }), "NOT_FOUND");
  });

  it("cannot use a guardian from B, even on its own child", async () => {
    await expectCode(
      recordAttendance(db, ownerA, "CHECK_IN", { childId: a.childId, guardianId: b.guardianId, clientEventId: crypto.randomUUID() }),
      "NOT_FOUND",
    );
    await expectCode(
      linkGuardian(db, ownerA, { childId: a.childId, guardianId: b.guardianId, relationship: "Aunt", isPrimary: false, authorizedPickup: true, emergencyContact: false }),
      "NOT_FOUND",
    );
    await expectCode(updateGuardian(db, ownerA, { guardianId: b.guardianId, firstName: "X", lastName: "Y", phone: "+501 600-9999" }), "NOT_FOUND");
  });

  it("cannot access B's staff", async () => {
    expect(await getStaffMember(db, ownerA, b.staffId)).toBeNull();
    expect((await listStaff(db, ownerA)).map((s) => s.id)).toEqual([a.staffId]);
    await expectCode(updateStaff(db, ownerA, { staffId: b.staffId, jobTitle: "Hacked" }), "NOT_FOUND");
  });

  it("cannot clock in B's staff with B's PIN", async () => {
    await expectCode(recordStaffTime(db, ownerA, "CLOCK_IN", { pin: b.staffPin, clientEventId: crypto.randomUUID() }), "INVALID_PIN");
  });
});
