import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { auditLogs } from "@/lib/db/schema";
import { createChild, getChildProfile, listChildRecords, setChildStatus, updateChild } from "@/lib/server/services/children";
import { createGuardian, linkGuardian, unlinkGuardian, updateGuardianLink } from "@/lib/server/services/guardians";
import { getOrganization, updateBranding } from "@/lib/server/services/organization";
import type { TenantContext } from "@/lib/server/tenant-context";
import { contextFor, createOrg, type OrgFixture } from "./helpers/fixtures";
import { createTestDatabase } from "./helpers/sqlite-executor";

let db: AppDb;
let org: OrgFixture;
let owner: TenantContext;

beforeEach(async () => {
  db = createTestDatabase().db;
  org = await createOrg(db, "Little Stars Daycare", "1234");
  owner = await contextFor(db, org.orgId, "DAYCARE_OWNER");
});

describe("children", () => {
  it("creates a child with a primary guardian and persists it", async () => {
    const { id } = await createChild(db, owner, {
      firstName: "Zoe",
      lastName: "King",
      dateOfBirth: "2023-03-03",
      classroomId: org.classroomId,
      allergyNotes: "",
      guardian: { firstName: "Natalie", lastName: "King", phone: "+501 600-1234", relationship: "Mother" },
    });
    const profile = await getChildProfile(db, owner, id);
    expect(profile?.classroomId).toBe(org.classroomId);
    expect(profile?.guardians).toHaveLength(1);
    expect(profile?.guardians[0].link.isPrimary).toBe(true);
    expect((await db.select().from(auditLogs).where(eq(auditLogs.entityId, id)))[0].action).toBe("CHILD_CREATED");
  });

  it("edits a child, audits field names only, and withdraws without deleting", async () => {
    await updateChild(db, owner, { childId: org.childId, preferredName: "Mari", medicalNotes: "Updated" });
    const [audit] = await db.select().from(auditLogs).where(eq(auditLogs.action, "CHILD_UPDATED"));
    expect(audit.metadataJson).toContain("medicalNotes");
    expect(audit.metadataJson).not.toContain("Updated");
    await setChildStatus(db, owner, { childId: org.childId, enrollmentStatus: "WITHDRAWN" });
    expect((await getChildProfile(db, owner, org.childId))?.enrollmentStatus).toBe("WITHDRAWN");
  });

  it("list views exclude sensitive notes but keep the allergy flag", async () => {
    const [child] = (await listChildRecords(db, owner, ["ACTIVE"])).filter((c) => c.id === org.childId);
    expect(child.hasAllergyAlert).toBe(true);
    expect(child.medicalNotes).toBeUndefined();
    expect(child.allergies).toBeUndefined();
    expect(child.guardians[0].guardian.email).toBeUndefined();
  });

  it("rejects a classroom from another organization", async () => {
    const other = await createOrg(db, "Other", "9999");
    await expect(updateChild(db, owner, { childId: org.childId, classroomId: other.classroomId })).rejects.toThrow();
  });
});

describe("guardians", () => {
  it("creates, links, re-assigns primary and unlinks without deleting the guardian", async () => {
    const { id: newGuardian } = await createGuardian(db, owner, {
      firstName: "Marcus",
      lastName: "Young",
      phone: "+501 600-5555",
      link: { childId: org.childId, relationship: "Father", isPrimary: true, authorizedPickup: true, emergencyContact: false },
    });
    let profile = await getChildProfile(db, owner, org.childId);
    const primaries = profile!.guardians.filter((g) => g.link.isPrimary);
    expect(primaries.map((g) => g.guardian.id)).toEqual([newGuardian]);

    const ruthLink = profile!.guardians.find((g) => g.guardian.id === org.emergencyOnlyGuardianId)!.link;
    await updateGuardianLink(db, owner, { linkId: ruthLink.id, authorizedPickup: true });
    profile = await getChildProfile(db, owner, org.childId);
    expect(profile!.guardians.find((g) => g.link.id === ruthLink.id)!.link.canPickUp).toBe(true);

    await unlinkGuardian(db, owner, { linkId: ruthLink.id });
    profile = await getChildProfile(db, owner, org.childId);
    expect(profile!.guardians.map((g) => g.guardian.id)).not.toContain(org.emergencyOnlyGuardianId);

    // Guardian record survives and can be re-linked
    await linkGuardian(db, owner, { childId: org.childId, guardianId: org.emergencyOnlyGuardianId, relationship: "Grandmother", isPrimary: false, authorizedPickup: false, emergencyContact: true });
    await expect(
      linkGuardian(db, owner, { childId: org.childId, guardianId: org.emergencyOnlyGuardianId, relationship: "Grandmother", isPrimary: false, authorizedPickup: false, emergencyContact: true }),
    ).rejects.toThrow();
  });
});

describe("branding", () => {
  it("persists name and colors", async () => {
    await updateBranding(db, owner, { name: "Bright Beginnings", tagline: "Shine", primaryColor: "#C2185B", secondaryColor: "#4a3aff", accentColor: "#ffb400", kioskWelcomeMessage: "Hi!" });
    const org2 = await getOrganization(db, owner);
    expect(org2.name).toBe("Bright Beginnings");
    expect(org2.branding.primaryColor).toBe("#c2185b");
    expect(org2.kioskWelcomeMessage).toBe("Hi!");
  });
});
