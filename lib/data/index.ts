import "server-only";

/**
 * Server-side data facade for pages and layouts.
 *
 * Every function resolves the tenant from the authenticated session
 * (requireTenantContext) and goes through the service layer, which
 * enforces permissions and scopes every query by organization_id.
 * Callers can't pass an organizationId — there is no parameter for it.
 *
 * Wrapped in React `cache()` so a layout and page share one lookup per request.
 */
import { cache } from "react";
import { getDb } from "@/lib/db";
import { requireTenantContext } from "@/lib/auth/tenant";
import { buildMockBilling, type MockBilling } from "@/lib/mock-data/payments";
import { listAttendanceWindow, listChildAttendanceHistory } from "@/lib/server/services/attendance";
import { getChildProfile, listChildRecords } from "@/lib/server/services/children";
import { getClassrooms, getOrganization } from "@/lib/server/services/organization";
import { getStaffMember, listStaff } from "@/lib/server/services/staff";
import { listStaffTimeWindow } from "@/lib/server/services/staff-time";
import { can } from "@/lib/server/tenant-context";
import { dateKey } from "@/lib/utils/format";
import { addDays, zonedStartOfDay } from "@/lib/utils/timezone";
import { fullName } from "@/lib/utils/people";
import type { AlertInputs } from "@/lib/hooks/use-today-alerts";
import type { ChildRecord, EnrollmentStatus } from "@/types/domain";

export type { ChildRecord, GuardianLink } from "@/types/domain";

/** Days of events delivered to client widgets (dashboard charts, reports up to "This Month"). */
export const EVENT_WINDOW_DAYS = 40;

const tenant = cache(async () => ({ ctx: await requireTenantContext(), db: getDb() }));

export const getCurrentOrganization = cache(async () => {
  const { ctx, db } = await tenant();
  return getOrganization(db, ctx);
});

export const getClassroomList = cache(async () => {
  const { ctx, db } = await tenant();
  return getClassrooms(db, ctx);
});

export const getChildRecords = cache(async (statuses?: EnrollmentStatus[]): Promise<ChildRecord[]> => {
  const { ctx, db } = await tenant();
  return listChildRecords(db, ctx, statuses);
});

export const getActiveChildRecords = cache(() => getChildRecords(["ACTIVE"]));

export const getChildRecord = cache(async (childId: string) => {
  const { ctx, db } = await tenant();
  return getChildProfile(db, ctx, childId);
});

export const getChildHistory = cache(async (childId: string) => {
  const { ctx, db } = await tenant();
  return listChildAttendanceHistory(db, ctx, childId);
});

export const getStaffList = cache(async () => {
  const { ctx, db } = await tenant();
  return listStaff(db, ctx);
});

export const getStaffById = cache(async (staffId: string) => {
  const { ctx, db } = await tenant();
  return getStaffMember(db, ctx, staffId);
});

/** Start of the event window: local midnight N days ago in the ORGANIZATION's timezone. */
export const getEventWindowStart = cache(async () => {
  const org = await getCurrentOrganization();
  return zonedStartOfDay(addDays(dateKey(new Date(), org.timezone), -EVENT_WINDOW_DAYS), org.timezone);
});

export const getAttendanceEvents = cache(async () => {
  const { ctx, db } = await tenant();
  return listAttendanceWindow(db, ctx, await getEventWindowStart());
});

export const getStaffTimeEvents = cache(async () => {
  const { ctx, db } = await tenant();
  return listStaffTimeWindow(db, ctx, await getEventWindowStart());
});

/** ⚠️ Mock billing derived from the real roster (payments persistence is a later phase). */
export const getMockBilling = cache(async (): Promise<MockBilling> => {
  const [org, roster, classrooms] = await Promise.all([getCurrentOrganization(), getChildRecords(), getClassroomList()]);
  return buildMockBilling(roster, new Map(classrooms.map((c) => [c.id, c.name])), {
    organizationId: org.id,
    receiptPrefix: org.receipt.receiptPrefix,
    today: dateKey(new Date(), org.timezone),
  });
});

export const getAlertInputs = cache(async (): Promise<AlertInputs> => {
  const { ctx } = await tenant();
  const [roster, staff] = await Promise.all([getActiveChildRecords(), getStaffList()]);
  let outstandingFamilies: number | null = null;
  if (can(ctx, "payments:view")) {
    const { invoices, payments } = await getMockBilling();
    const paid = new Map<string, number>();
    for (const p of payments) paid.set(p.childId, (paid.get(p.childId) ?? 0) + p.amount);
    const owing = new Set<string>();
    const invoiced = new Map<string, { total: number; guardianId: string }>();
    for (const i of invoices) {
      const cur = invoiced.get(i.childId) ?? { total: 0, guardianId: i.guardianId };
      cur.total += i.amount;
      invoiced.set(i.childId, cur);
    }
    for (const [childId, { total, guardianId }] of invoiced) if (total - (paid.get(childId) ?? 0) > 0) owing.add(guardianId);
    outstandingFamilies = owing.size;
  }
  return {
    children: roster.map(({ id, firstName, lastName }) => ({ id, firstName, lastName })),
    staffOnLeave: staff.filter((s) => s.employmentStatus === "ON_LEAVE").map((s) => ({ name: fullName(s), reason: s.statusNote ?? "Leave" })),
    outstandingFamilies,
  };
});
