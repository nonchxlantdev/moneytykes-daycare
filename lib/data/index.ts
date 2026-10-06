/**
 * DATA ACCESS LAYER (mock implementation).
 *
 * Pages and server components fetch through these functions only —
 * never by importing lib/mock-data directly. In Phase 2 each function
 * is reimplemented against Cloudflare D1 (Drizzle) with:
 *   - the active organization resolved from the session / host
 *   - membership + role checks enforced server-side
 *   - every query scoped by organization_id
 * The signatures already take `organizationId` so call sites won't change.
 */
import type {
  AttendanceEvent,
  Child,
  ChildDocument,
  ChildGuardian,
  Classroom,
  Guardian,
  Invoice,
  Organization,
  Payment,
  Staff,
  StaffTimeEvent,
} from "@/types/domain";
import { connection } from "next/server";
import type { ActivityNote } from "@/lib/mock-data/activity";
import { mockChildren } from "@/lib/mock-data/children";
import { mockChildGuardians, mockGuardians } from "@/lib/mock-data/guardians";
import { mockClassrooms, mockOrganization } from "@/lib/mock-data/organization";
import { getDemoSeed } from "@/lib/mock-data/seed";
import { mockStaff } from "@/lib/mock-data/staff";

export interface GuardianLink {
  guardian: Guardian;
  link: ChildGuardian;
}

export interface ChildRecord extends Child {
  guardians: GuardianLink[];
}

/**
 * Mock seed data is relative to "now", so opt out of build-time
 * prerendering for anything time-dependent. (Real D1 queries are
 * dynamic anyway.)
 */
async function timeRelativeSeed() {
  await connection();
  return getDemoSeed();
}

const byOrg = <T extends { organizationId: string }>(rows: T[], organizationId: string) =>
  rows.filter((r) => r.organizationId === organizationId);

/** Resolve the active tenant. Later: from subdomain/custom domain + session. */
export async function getActiveOrganization(): Promise<Organization> {
  return mockOrganization;
}

export async function listClassrooms(organizationId: string): Promise<Classroom[]> {
  return byOrg(mockClassrooms, organizationId);
}

function withGuardians(child: Child): ChildRecord {
  const guardians = mockChildGuardians
    .filter((l) => l.childId === child.id && l.organizationId === child.organizationId)
    .map((link) => ({ link, guardian: mockGuardians.find((g) => g.id === link.guardianId)! }))
    .filter((gl) => Boolean(gl.guardian));
  return { ...child, guardians };
}

export async function listChildren(organizationId: string): Promise<ChildRecord[]> {
  return byOrg(mockChildren, organizationId).map(withGuardians);
}

export async function getChild(organizationId: string, childId: string): Promise<ChildRecord | null> {
  const child = mockChildren.find((c) => c.id === childId && c.organizationId === organizationId);
  return child ? withGuardians(child) : null;
}

export async function listStaff(organizationId: string): Promise<Staff[]> {
  return byOrg(mockStaff, organizationId);
}

export async function getStaffMember(organizationId: string, staffId: string): Promise<Staff | null> {
  return mockStaff.find((s) => s.id === staffId && s.organizationId === organizationId) ?? null;
}

export async function listAttendanceEvents(organizationId: string): Promise<AttendanceEvent[]> {
  return byOrg((await timeRelativeSeed()).attendanceEvents, organizationId);
}

export async function listStaffTimeEvents(organizationId: string): Promise<StaffTimeEvent[]> {
  return byOrg((await timeRelativeSeed()).staffTimeEvents, organizationId);
}

export async function listInvoices(organizationId: string): Promise<Invoice[]> {
  return byOrg((await timeRelativeSeed()).invoices, organizationId);
}

export async function listPayments(organizationId: string): Promise<Payment[]> {
  return byOrg((await timeRelativeSeed()).payments, organizationId);
}

export async function getNextReceiptSequence(): Promise<number> {
  return (await timeRelativeSeed()).nextReceiptSequence;
}

export async function listChildDocuments(organizationId: string, childId: string): Promise<ChildDocument[]> {
  return byOrg((await timeRelativeSeed()).childDocuments, organizationId).filter((d) => d.childId === childId);
}

export async function listActivityNotes(organizationId: string): Promise<ActivityNote[]> {
  return byOrg((await timeRelativeSeed()).activityNotes, organizationId);
}

export type { ActivityNote };
