import { and, asc, desc, eq, gte, sql } from "drizzle-orm";
import type { AppDb } from "../client";
import { attendanceEvents, staffTimeEvents } from "../schema";

/* ------------------------------ attendance ------------------------------ */

export async function listAttendanceSince(db: AppDb, organizationId: string, since: Date) {
  return db
    .select()
    .from(attendanceEvents)
    .where(and(eq(attendanceEvents.organizationId, organizationId), gte(attendanceEvents.eventTime, since)))
    .orderBy(asc(attendanceEvents.eventTime), asc(attendanceEvents.createdAt));
}

export async function listChildAttendance(db: AppDb, organizationId: string, childId: string, limit = 200) {
  return db
    .select()
    .from(attendanceEvents)
    .where(and(eq(attendanceEvents.organizationId, organizationId), eq(attendanceEvents.childId, childId)))
    .orderBy(desc(attendanceEvents.eventTime), desc(attendanceEvents.createdAt))
    .limit(limit);
}

/** Latest event for the child since `since` (the start of the organization's day). */
export async function latestAttendanceEvent(db: AppDb, organizationId: string, childId: string, since: Date) {
  const [row] = await db
    .select()
    .from(attendanceEvents)
    .where(and(eq(attendanceEvents.organizationId, organizationId), eq(attendanceEvents.childId, childId), gte(attendanceEvents.eventTime, since)))
    .orderBy(desc(attendanceEvents.eventTime), desc(attendanceEvents.createdAt), desc(attendanceEvents.id))
    .limit(1);
  return row;
}

export async function attendanceByClientEventId(db: AppDb, organizationId: string, clientEventId: string) {
  return db.query.attendanceEvents.findFirst({
    where: and(eq(attendanceEvents.organizationId, organizationId), eq(attendanceEvents.clientEventId, clientEventId)),
  });
}

export interface AttendanceInsert {
  id: string;
  organizationId: string;
  childId: string;
  guardianId: string | null;
  eventType: "CHECK_IN" | "CHECK_OUT";
  eventTime: Date;
  notes: string | null;
  createdByUserId: string | null;
  clientEventId: string;
}

/**
 * Insert an attendance event ONLY if the child's latest event TODAY (since `dayStart`) is
 * `requiredPrevious` (or there is none and requiredPrevious is CHECK_OUT).
 * A single statement, so two simultaneous check-ins cannot both succeed.
 * Returns the new id via RETURNING (empty when the transition is invalid).
 */
export function conditionalAttendanceInsert(db: AppDb, e: AttendanceInsert, requiredPrevious: "CHECK_IN" | "CHECK_OUT", dayStart: Date) {
  const now = Date.now();
  return db.all<[string]>(sql`
    INSERT INTO attendance_events
      (id, organization_id, child_id, guardian_id, event_type, event_time, device_id, signature_object_key, notes, created_by_user_id, client_event_id, created_at)
    SELECT ${e.id}, ${e.organizationId}, ${e.childId}, ${e.guardianId}, ${e.eventType}, ${e.eventTime.getTime()}, NULL, NULL, ${e.notes}, ${e.createdByUserId}, ${e.clientEventId}, ${now}
    WHERE COALESCE(
      (SELECT event_type FROM attendance_events
        WHERE organization_id = ${e.organizationId} AND child_id = ${e.childId} AND event_time >= ${dayStart.getTime()}
        ORDER BY event_time DESC, created_at DESC, id DESC LIMIT 1),
      'CHECK_OUT'
    ) = ${requiredPrevious}
    RETURNING id
  `);
}

/* ------------------------------ staff time ------------------------------ */

export async function listStaffTimeSince(db: AppDb, organizationId: string, since: Date) {
  return db
    .select()
    .from(staffTimeEvents)
    .where(and(eq(staffTimeEvents.organizationId, organizationId), gte(staffTimeEvents.eventTime, since)))
    .orderBy(asc(staffTimeEvents.eventTime), asc(staffTimeEvents.createdAt));
}

/** Latest clock event for the staff member since `since` (the start of the organization's day). */
export async function latestStaffTimeEvent(db: AppDb, organizationId: string, staffId: string, since: Date) {
  const [row] = await db
    .select()
    .from(staffTimeEvents)
    .where(and(eq(staffTimeEvents.organizationId, organizationId), eq(staffTimeEvents.staffId, staffId), gte(staffTimeEvents.eventTime, since)))
    .orderBy(desc(staffTimeEvents.eventTime), desc(staffTimeEvents.createdAt), desc(staffTimeEvents.id))
    .limit(1);
  return row;
}

export async function staffTimeByClientEventId(db: AppDb, organizationId: string, clientEventId: string) {
  return db.query.staffTimeEvents.findFirst({
    where: and(eq(staffTimeEvents.organizationId, organizationId), eq(staffTimeEvents.clientEventId, clientEventId)),
  });
}

export interface StaffTimeInsert {
  id: string;
  organizationId: string;
  staffId: string;
  eventType: "CLOCK_IN" | "CLOCK_OUT";
  eventTime: Date;
  createdByUserId: string | null;
  clientEventId: string;
}

export function conditionalStaffTimeInsert(db: AppDb, e: StaffTimeInsert, requiredPrevious: "CLOCK_IN" | "CLOCK_OUT", dayStart: Date) {
  const now = Date.now();
  return db.all<[string]>(sql`
    INSERT INTO staff_time_events
      (id, organization_id, staff_id, event_type, event_time, device_id, created_by_user_id, client_event_id, created_at)
    SELECT ${e.id}, ${e.organizationId}, ${e.staffId}, ${e.eventType}, ${e.eventTime.getTime()}, NULL, ${e.createdByUserId}, ${e.clientEventId}, ${now}
    WHERE COALESCE(
      (SELECT event_type FROM staff_time_events
        WHERE organization_id = ${e.organizationId} AND staff_id = ${e.staffId} AND event_time >= ${dayStart.getTime()}
        ORDER BY event_time DESC, created_at DESC, id DESC LIMIT 1),
      'CLOCK_OUT'
    ) = ${requiredPrevious}
    RETURNING id
  `);
}
