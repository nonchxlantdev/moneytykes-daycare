import { describe, expect, it } from "vitest";
import { buildSeed, LITTLE_STARS_ORG_ID, RAINBOW_ORG_ID, seedId } from "../scripts/seed/build-seed";
import { listAttendanceWindow } from "@/lib/server/services/attendance";
import { listChildRecords } from "@/lib/server/services/children";
import { getOrganization } from "@/lib/server/services/organization";
import { listStaff } from "@/lib/server/services/staff";
import { verifyStaffPin } from "@/lib/server/services/staff-time";
import { NoMembershipError, resolveTenantContext } from "@/lib/server/tenant-context";
import { createTestDatabase } from "./helpers/sqlite-executor";

const OPTS = {
  adminAuthProviderId: "password:usr_bootstrap",
  adminEmail: "owner@example.test",
  adminFirstName: "Test",
  adminLastName: "Owner",
  // A Wednesday afternoon in Belize, so "today" has check-ins and early pickups.
  now: new Date("2026-10-07T21:00:00Z"),
};

async function seeded() {
  const { db, sqlite } = createTestDatabase();
  const seed = await buildSeed(OPTS);
  for (const statement of seed.statements) sqlite.exec(statement);
  return { db, sqlite, seed };
}

describe("development seed", () => {
  it("creates Little Stars with the named children and staff, and links the configured owner", async () => {
    const { db } = await seeded();
    const ctx = await resolveTenantContext(db, OPTS.adminAuthProviderId);
    expect(ctx.organizationId).toBe(LITTLE_STARS_ORG_ID);
    expect(ctx.role).toBe("DAYCARE_OWNER");

    const org = await getOrganization(db, ctx);
    expect(org.name).toBe("Little Stars Daycare");
    expect(org.timezone).toBe("America/Belize");

    const roster = await listChildRecords(db, ctx);
    const names = roster.map((c) => `${c.firstName} ${c.lastName}`);
    for (const n of ["Amari Young", "Jayden Smith", "Sophie Jones", "Noah Brown", "Emma White", "Liam Carter", "Olivia Martin", "Ethan Wilson"]) {
      expect(names).toContain(n);
    }
    expect(roster.every((c) => c.guardians.length >= 2)).toBe(true);

    const staffNames = (await listStaff(db, ctx)).map((s) => `${s.firstName} ${s.lastName}`);
    for (const n of ["Sarah Wilson", "Michael Carter", "Jasmine Green", "David Thompson"]) expect(staffNames).toContain(n);
  });

  it("stores staff PINs only as bcrypt hashes, and they verify", async () => {
    const { db, sqlite, seed } = await seeded();
    const rows = sqlite.prepare("SELECT pin_hash FROM staff").all() as Array<{ pin_hash: string }>;
    expect(rows.length).toBe(8);
    for (const r of rows) expect(r.pin_hash).toMatch(/^\$2[aby]\$10\$/);
    const all = seed.statements.join("\n");
    for (const { pin } of seed.demoPins) expect(all).not.toContain(`'${pin}'`);

    const ctx = await resolveTenantContext(db, OPTS.adminAuthProviderId);
    const { staff } = await verifyStaffPin(db, ctx, { pin: "1234" });
    expect(`${staff.firstName} ${staff.lastName}`).toBe("Sarah Wilson");
  });

  it("generates attendance history without signatures and never in the future", async () => {
    const { db, sqlite } = await seeded();
    const ctx = await resolveTenantContext(db, OPTS.adminAuthProviderId);
    const events = await listAttendanceWindow(db, ctx, new Date(OPTS.now.getTime() - 20 * 86_400_000));
    expect(events.length).toBeGreaterThan(400);
    expect(events.every((e) => new Date(e.eventTime).getTime() <= OPTS.now.getTime())).toBe(true);
    const sig = sqlite.prepare("SELECT COUNT(*) AS n FROM attendance_events WHERE signature_object_key IS NOT NULL").get() as { n: number };
    expect(sig.n).toBe(0);
  });

  it("is idempotent — running it twice adds nothing", async () => {
    const { sqlite, seed } = await seeded();
    const count = () => (sqlite.prepare("SELECT (SELECT COUNT(*) FROM children) + (SELECT COUNT(*) FROM attendance_events) AS n").get() as { n: number }).n;
    const before = count();
    for (const statement of seed.statements) sqlite.exec(statement);
    expect(count()).toBe(before);
  });

  it("keeps the second sample tenant invisible to the seeded owner", async () => {
    const { db } = await seeded();
    const ctx = await resolveTenantContext(db, OPTS.adminAuthProviderId);
    const roster = await listChildRecords(db, ctx);
    expect(roster.some((c) => c.organizationId === RAINBOW_ORG_ID)).toBe(false);
    expect(roster.some((c) => c.id === seedId("child:rainbow:rb-1"))).toBe(false);
  });

  it("does not grant access to identities that were not seeded", async () => {
    const { db } = await seeded();
    await expect(resolveTenantContext(db, "password:someone-else")).rejects.toBeInstanceOf(NoMembershipError);
  });
});
