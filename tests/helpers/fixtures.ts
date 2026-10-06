import bcrypt from "bcryptjs";
import type { AppDb } from "@/lib/db/client";
import { childGuardians, children, classrooms, guardians, organizationBranding, organizationMemberships, organizations, staff, users } from "@/lib/db/schema";
import { resolveTenantContext, type TenantContext } from "@/lib/server/tenant-context";

type Role = "DAYCARE_OWNER" | "DAYCARE_ADMIN" | "DAYCARE_STAFF" | "PLATFORM_ADMIN";

export interface OrgFixture {
  orgId: string;
  classroomId: string;
  childId: string;
  withdrawnChildId: string;
  guardianId: string;
  /** Linked to the child but NOT allowed to pick up. */
  emergencyOnlyGuardianId: string;
  staffId: string;
  staffPin: string;
}

let n = 0;
const uid = () => crypto.randomUUID();

export async function createOrg(db: AppDb, name: string, staffPin: string): Promise<OrgFixture> {
  n++;
  const orgId = uid();
  const classroomId = uid();
  const childId = uid();
  const withdrawnChildId = uid();
  const guardianId = uid();
  const emergencyOnlyGuardianId = uid();
  const staffId = uid();
  await db.insert(organizations).values({ id: orgId, name, slug: `org-${n}-${orgId.slice(0, 6)}`, timezone: "America/Belize", currency: "BZD" });
  await db.insert(organizationBranding).values({ organizationId: orgId });
  await db.insert(classrooms).values({ id: classroomId, organizationId: orgId, name: "Toddlers" });
  await db.insert(children).values([
    { id: childId, organizationId: orgId, firstName: "Amari", lastName: `Young${n}`, dateOfBirth: "2022-03-14", classroomId, allergyNotes: "Peanuts", medicalNotes: "EpiPen in backpack" },
    { id: withdrawnChildId, organizationId: orgId, firstName: "Former", lastName: "Kid", dateOfBirth: "2021-01-01", enrollmentStatus: "WITHDRAWN" },
  ]);
  await db.insert(guardians).values([
    { id: guardianId, organizationId: orgId, firstName: "Sarah", lastName: "Young", phone: "+501 600-0001", email: "sarah@example.com" },
    { id: emergencyOnlyGuardianId, organizationId: orgId, firstName: "Ruth", lastName: "Young", phone: "+501 600-0002" },
  ]);
  await db.insert(childGuardians).values([
    { organizationId: orgId, childId, guardianId, relationship: "Mother", isPrimary: true, authorizedPickup: true, emergencyContact: false },
    { organizationId: orgId, childId, guardianId: emergencyOnlyGuardianId, relationship: "Grandmother", isPrimary: false, authorizedPickup: false, emergencyContact: true },
  ]);
  await db.insert(staff).values({
    id: staffId,
    organizationId: orgId,
    firstName: "Sarah",
    lastName: "Wilson",
    jobTitle: "Lead Teacher",
    pinHash: await bcrypt.hash(staffPin, 4),
  });
  return { orgId, classroomId, childId, withdrawnChildId, guardianId, emergencyOnlyGuardianId, staffId, staffPin };
}

/** Create a user + membership and resolve its context exactly as the app does. */
export async function contextFor(db: AppDb, orgId: string, role: Role): Promise<TenantContext> {
  const userId = uid();
  const authProviderId = `password:test-${userId}`;
  await db.insert(users).values({ id: userId, authProviderId, email: `${role.toLowerCase()}@${orgId.slice(0, 6)}.test`, firstName: role, lastName: "User" });
  await db.insert(organizationMemberships).values({ organizationId: orgId, userId, role });
  return resolveTenantContext(db, authProviderId);
}
