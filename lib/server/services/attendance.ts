import type { AppDb } from "@/lib/db/client";
import { isUniqueViolation } from "@/lib/db/executor";
import { auditInsertIfEventExists } from "@/lib/db/repositories/audit";
import { getChildRow } from "@/lib/db/repositories/children";
import {
  attendanceByClientEventId,
  conditionalAttendanceInsert,
  latestAttendanceEvent,
  listAttendanceSince,
  listChildAttendance,
} from "@/lib/db/repositories/events";
import { findLink } from "@/lib/db/repositories/guardians";
import { checkInChildSchema, checkOutChildSchema } from "@/lib/validation/mutations";
import type { AttendanceEvent, AttendanceEventType } from "@/types/domain";
import { AppError, forbidden, notFound } from "../errors";
import { nullIfEmpty, toAttendanceEvent } from "../mappers";
import { operationalDayStart } from "../operational-day";
import { assertCan, type TenantContext } from "../tenant-context";

export interface RecordAttendanceResult {
  event: AttendanceEvent;
  /** True when this clientEventId was already recorded (safe retry). */
  duplicate: boolean;
}

/**
 * Record a CHECK_IN or CHECK_OUT.
 *
 *   validate → authorize → child in org → guardian link in org →
 *   atomic conditional insert (state machine) + audit → result
 *
 * The event time is assigned by the SERVER (client clocks are not trusted).
 */
export async function recordAttendance(
  db: AppDb,
  ctx: TenantContext,
  type: AttendanceEventType,
  raw: unknown,
  now: Date = new Date(),
): Promise<RecordAttendanceResult> {
  assertCan(ctx, "attendance:record");
  const v = (type === "CHECK_IN" ? checkInChildSchema : checkOutChildSchema).parse(raw);
  const org = ctx.organizationId;

  const replay = async (): Promise<RecordAttendanceResult | null> => {
    const existing = await attendanceByClientEventId(db, org, v.clientEventId);
    if (!existing) return null;
    if (existing.childId !== v.childId || existing.eventType !== type) {
      throw new AppError("CONFLICT", "This request was already used for a different action. Please try again.");
    }
    return { event: toAttendanceEvent(existing), duplicate: true };
  };

  const earlier = await replay();
  if (earlier) return earlier;

  const child = await getChildRow(db, org, v.childId);
  if (!child) throw notFound("Child");
  if (type === "CHECK_IN" && child.enrollmentStatus !== "ACTIVE") {
    throw new AppError("INVALID_TRANSITION", `${child.firstName} isn't actively enrolled, so they can't be checked in.`);
  }

  if (v.guardianId) {
    const link = await findLink(db, org, v.childId, v.guardianId);
    if (!link) throw notFound("Guardian");
    if (type === "CHECK_OUT" && !link.authorizedPickup) {
      throw forbidden(`That person is not an authorized pickup for ${child.firstName}.`);
    }
  }

  const id = crypto.randomUUID();
  const action = type === "CHECK_IN" ? "ATTENDANCE_CHECK_IN" : "ATTENDANCE_CHECK_OUT";
  let inserted: [string][];
  try {
    [inserted] = await db.batch([
      conditionalAttendanceInsert(
        db,
        {
          id,
          organizationId: org,
          childId: v.childId,
          guardianId: v.guardianId ?? null,
          eventType: type,
          eventTime: now,
          notes: nullIfEmpty(v.notes),
          createdByUserId: ctx.user.id,
          clientEventId: v.clientEventId,
        },
        type === "CHECK_IN" ? "CHECK_OUT" : "CHECK_IN",
        operationalDayStart(ctx, now),
      ),
      auditInsertIfEventExists(
        db,
        { organizationId: org, userId: ctx.user.id, action, entityType: "attendance_event", entityId: id, metadata: { childId: v.childId, guardianId: v.guardianId ?? null } },
        "attendance_events",
      ),
    ]);
  } catch (error) {
    // Lost a race against an identical retry: return the stored event.
    if (isUniqueViolation(error)) {
      const again = await replay();
      if (again) return again;
    }
    throw error;
  }

  if (inserted.length === 0) {
    const latest = await latestAttendanceEvent(db, org, v.childId, operationalDayStart(ctx, now));
    if (type === "CHECK_IN") {
      throw new AppError("ALREADY_CHECKED_IN", `${child.firstName} is already checked in.`);
    }
    throw new AppError(
      latest ? "ALREADY_CHECKED_OUT" : "NOT_CHECKED_IN",
      latest ? `${child.firstName} has already been checked out today.` : `${child.firstName} isn't checked in today.`,
    );
  }

  return {
    event: {
      id,
      organizationId: org,
      childId: v.childId,
      guardianId: v.guardianId,
      type,
      eventTime: now.toISOString(),
      notes: nullIfEmpty(v.notes) ?? undefined,
    },
    duplicate: false,
  };
}

export async function listAttendanceWindow(db: AppDb, ctx: TenantContext, since: Date): Promise<AttendanceEvent[]> {
  assertCan(ctx, "attendance:read");
  return (await listAttendanceSince(db, ctx.organizationId, since)).map(toAttendanceEvent);
}

export async function listChildAttendanceHistory(db: AppDb, ctx: TenantContext, childId: string): Promise<AttendanceEvent[]> {
  assertCan(ctx, "attendance:read");
  return (await listChildAttendance(db, ctx.organizationId, childId)).map(toAttendanceEvent);
}
