import { beforeEach, describe, expect, it } from "vitest";
import type { AppDb } from "@/lib/db/client";
import { AppError } from "@/lib/server/errors";
import { roleHasPermission } from "@/lib/server/permissions";
import { recordAttendance } from "@/lib/server/services/attendance";
import { createChild, getChildProfile } from "@/lib/server/services/children";
import { createGuardian } from "@/lib/server/services/guardians";
import { getOrganization, updateBranding, updateOrganizationSettings } from "@/lib/server/services/organization";
import { createStaff } from "@/lib/server/services/staff";
import type { TenantContext } from "@/lib/server/tenant-context";
import { contextFor, createOrg, type OrgFixture } from "./helpers/fixtures";
import { createTestDatabase } from "./helpers/sqlite-executor";

let db: AppDb;
let org: OrgFixture;
let owner: TenantContext;
let staffUser: TenantContext;

const branding = { name: "Little Stars", tagline: "Learn • Play • Grow", primaryColor: "#0f8b8d", secondaryColor: "#3d5a80", accentColor: "#ee6c4d", kioskWelcomeMessage: "Hello!" };
const settings = { timezone: "America/Belize", currency: "BZD", expectedArrivalBy: "08:30", receiptPrefix: "LS" };

beforeEach(async () => {
  db = createTestDatabase().db;
  org = await createOrg(db, "Little Stars Daycare", "1234");
  owner = await contextFor(db, org.orgId, "DAYCARE_OWNER");
  staffUser = await contextFor(db, org.orgId, "DAYCARE_STAFF");
});

const forbidden = (e: unknown) => e instanceof AppError && e.code === "FORBIDDEN";

describe("DAYCARE_STAFF restrictions (server-side)", () => {
  it("cannot modify branding or organization settings", async () => {
    await expect(updateBranding(db, staffUser, branding)).rejects.toSatisfy(forbidden);
    await expect(updateOrganizationSettings(db, staffUser, settings)).rejects.toSatisfy(forbidden);
    expect((await getOrganization(db, staffUser)).name).toBe("Little Stars Daycare");
  });

  it("cannot create children, guardians or staff", async () => {
    await expect(createChild(db, staffUser, { firstName: "A", lastName: "B", dateOfBirth: "2022-01-01" })).rejects.toSatisfy(forbidden);
    await expect(createGuardian(db, staffUser, { firstName: "A", lastName: "B", phone: "+501 600-1111" })).rejects.toSatisfy(forbidden);
    await expect(createStaff(db, staffUser, { firstName: "A", lastName: "B", jobTitle: "Aide", employmentStatus: "ACTIVE" })).rejects.toSatisfy(forbidden);
  });

  it("can view children and record attendance", async () => {
    const child = await getChildProfile(db, staffUser, org.childId);
    expect(child?.firstName).toBe("Amari");
    expect(child?.allergies).toEqual(["Peanuts"]); // safety info visible to staff
    expect(child?.medicalNotes).toBeUndefined(); // medical notes are owner/admin only
    const res = await recordAttendance(db, staffUser, "CHECK_IN", { childId: org.childId, clientEventId: crypto.randomUUID() });
    expect(res.event.type).toBe("CHECK_IN");
  });

  it("owners see medical notes and can change branding", async () => {
    expect((await getChildProfile(db, owner, org.childId))?.medicalNotes).toBe("EpiPen in backpack");
    const updated = await updateBranding(db, owner, branding);
    expect(updated.name).toBe("Little Stars");
    expect(updated.branding.primaryColor).toBe("#0f8b8d");
  });

  it("permission matrix matches the spec", () => {
    expect(roleHasPermission("DAYCARE_STAFF", "branding:manage")).toBe(false);
    expect(roleHasPermission("DAYCARE_STAFF", "settings:manage")).toBe(false);
    expect(roleHasPermission("DAYCARE_STAFF", "attendance:record")).toBe(true);
    expect(roleHasPermission("DAYCARE_ADMIN", "children:write")).toBe(true);
    expect(roleHasPermission("DAYCARE_OWNER", "staff:manage")).toBe(true);
  });
});
