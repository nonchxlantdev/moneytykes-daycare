import type { AppDb } from "@/lib/db/client";
import { isUniqueViolation } from "@/lib/db/executor";
import { auditInsertIfEventExists } from "@/lib/db/repositories/audit";
import {
  conditionalStaffTimeInsert,
  latestStaffTimeEvent,
  listStaffTimeSince,
  staffTimeByClientEventId,
} from "@/lib/db/repositories/events";
import { getStaffRow } from "@/lib/db/repositories/staff";
import { clockInStaffSchema, verifyStaffPinSchema } from "@/lib/validation/mutations";
import type { Staff, StaffTimeEvent, StaffTimeEventType } from "@/types/domain";
import { AppError } from "../errors";
import { toStaff, toStaffTimeEvent } from "../mappers";
import { operationalDayStart } from "../operational-day";
import { assertCan, type TenantContext } from "../tenant-context";
import { findStaffByPin } from "./staff";

const invalidPin = () => new AppError("INVALID_PIN", "PIN not recognised. Please try again.");

/** Identify a staff member at the time clock. Returns the public profile and current duty state. */
export async function verifyStaffPin(
  db: AppDb,
  ctx: TenantContext,
  raw: unknown,
  now: Date = new Date(),
): Promise<{ staff: Staff; onDuty: boolean }> {
  assertCan(ctx, "staff-time:record");
  const { pin } = verifyStaffPinSchema.parse(raw);
  const match = await findStaffByPin(db, ctx.organizationId, pin);
  if (!match) throw invalidPin();
  const row = await getStaffRow(db, ctx.organizationId, match.id);
  if (!row) throw invalidPin();
  const latest = await latestStaffTimeEvent(db, ctx.organizationId, row.id, operationalDayStart(ctx, now));
  return { staff: toStaff(row), onDuty: latest?.eventType === "CLOCK_IN" };
}

/**
 * CLOCK_IN / CLOCK_OUT. The PIN is re-verified on every clock action, so a
 * staff id from the browser is never trusted. Transition rules are enforced
 * atomically in SQL (see conditionalStaffTimeInsert).
 */
export async function recordStaffTime(
  db: AppDb,
  ctx: TenantContext,
  type: StaffTimeEventType,
  raw: unknown,
  now: Date = new Date(),
): Promise<{ event: StaffTimeEvent; staff: Staff; duplicate: boolean }> {
  assertCan(ctx, "staff-time:record");
  const v = clockInStaffSchema.parse(raw);
  const org = ctx.organizationId;

  const match = await findStaffByPin(db, org, v.pin);
  if (!match) throw invalidPin();
  const staffRow = await getStaffRow(db, org, match.id);
  if (!staffRow) throw invalidPin();
  const staff = toStaff(staffRow);

  const replay = async () => {
    const existing = await staffTimeByClientEventId(db, org, v.clientEventId);
    if (!existing) return null;
    if (existing.staffId !== staffRow.id || existing.eventType !== type) {
      throw new AppError("CONFLICT", "This request was already used for a different action. Please try again.");
    }
    return { event: toStaffTimeEvent(existing), staff, duplicate: true };
  };
  const earlier = await replay();
  if (earlier) return earlier;

  if (type === "CLOCK_IN" && staffRow.employmentStatus !== "ACTIVE") {
    throw new AppError("INVALID_TRANSITION", `${staffRow.firstName} isn't active, so they can't clock in. Please see a manager.`);
  }

  const id = crypto.randomUUID();
  let inserted: [string][];
  try {
    [inserted] = await db.batch([
      conditionalStaffTimeInsert(
        db,
        { id, organizationId: org, staffId: staffRow.id, eventType: type, eventTime: now, createdByUserId: ctx.user.id, clientEventId: v.clientEventId },
        type === "CLOCK_IN" ? "CLOCK_OUT" : "CLOCK_IN",
        operationalDayStart(ctx, now),
      ),
      auditInsertIfEventExists(
        db,
        { organizationId: org, userId: ctx.user.id, action: type === "CLOCK_IN" ? "STAFF_CLOCK_IN" : "STAFF_CLOCK_OUT", entityType: "staff_time_event", entityId: id, metadata: { staffId: staffRow.id } },
        "staff_time_events",
      ),
    ]);
  } catch (error) {
    if (isUniqueViolation(error)) {
      const again = await replay();
      if (again) return again;
    }
    throw error;
  }

  if (inserted.length === 0) {
    if (type === "CLOCK_IN") throw new AppError("ALREADY_CLOCKED_IN", `${staffRow.firstName} is already clocked in.`);
    throw new AppError("NOT_CLOCKED_IN", `${staffRow.firstName} isn't clocked in today.`);
  }
  return {
    event: { id, organizationId: org, staffId: staffRow.id, type, eventTime: now.toISOString() },
    staff,
    duplicate: false,
  };
}

export async function listStaffTimeWindow(db: AppDb, ctx: TenantContext, since: Date): Promise<StaffTimeEvent[]> {
  assertCan(ctx, "staff:read");
  return (await listStaffTimeSince(db, ctx.organizationId, since)).map(toStaffTimeEvent);
}
