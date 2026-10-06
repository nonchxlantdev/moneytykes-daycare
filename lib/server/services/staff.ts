import bcrypt from "bcryptjs";
import type { AppDb } from "@/lib/db/client";
import { isUniqueViolation } from "@/lib/db/executor";
import { auditInsert } from "@/lib/db/repositories/audit";
import { classroomBelongsToOrg } from "@/lib/db/repositories/organizations";
import { getStaffRow, insertStaffRow, listStaffRows, listStaffWithPins, updateStaffRow } from "@/lib/db/repositories/staff";
import { createStaffSchema, updateStaffSchema } from "@/lib/validation/mutations";
import type { Staff } from "@/types/domain";
import { AppError, notFound } from "../errors";
import { nullIfEmpty, toStaff } from "../mappers";
import { assertCan, type TenantContext } from "../tenant-context";

/** bcrypt cost for 4–6 digit PINs. PINs are low-entropy, so kiosk rate limiting (Phase 3) matters more than cost. */
export const PIN_HASH_ROUNDS = 10;

export async function listStaff(db: AppDb, ctx: TenantContext): Promise<Staff[]> {
  assertCan(ctx, "staff:read");
  return (await listStaffRows(db, ctx.organizationId)).map(toStaff);
}

export async function getStaffMember(db: AppDb, ctx: TenantContext, staffId: string): Promise<Staff | null> {
  assertCan(ctx, "staff:read");
  const row = await getStaffRow(db, ctx.organizationId, staffId);
  return row ? toStaff(row) : null;
}

/** Find the staff member whose PIN matches. Server-side only; hashes never leave this module. */
export async function findStaffByPin(db: AppDb, organizationId: string, pin: string) {
  for (const row of await listStaffWithPins(db, organizationId)) {
    if (row.pinHash && (await bcrypt.compare(pin, row.pinHash))) return row;
  }
  return undefined;
}

/** PINs identify a person at the time clock, so two staff in one daycare can't share one. */
async function assertPinAvailable(db: AppDb, organizationId: string, pin: string, exceptStaffId?: string) {
  const owner = await findStaffByPin(db, organizationId, pin);
  if (owner && owner.id !== exceptStaffId) {
    throw new AppError("VALIDATION", "That PIN is already in use. Choose a different one.", { pin: "PIN already in use" });
  }
}

async function assertClassroom(db: AppDb, ctx: TenantContext, classroomId: string | null) {
  if (classroomId && !(await classroomBelongsToOrg(db, ctx.organizationId, classroomId))) {
    throw new AppError("VALIDATION", "Choose a valid class.", { classroomId: "Choose a valid class" });
  }
}

function employeeNumberTaken(error: unknown): never {
  if (isUniqueViolation(error)) {
    throw new AppError("VALIDATION", "That employee number is already used.", { employeeNumber: "Already used" });
  }
  throw error;
}

export async function createStaff(db: AppDb, ctx: TenantContext, raw: unknown): Promise<{ id: string }> {
  assertCan(ctx, "staff:manage");
  const v = createStaffSchema.parse(raw);
  const classroomId = nullIfEmpty(v.classroomId);
  await assertClassroom(db, ctx, classroomId);
  const pin = nullIfEmpty(v.pin);
  if (pin) await assertPinAvailable(db, ctx.organizationId, pin);

  const id = crypto.randomUUID();
  try {
    await db.batch([
      insertStaffRow(db, {
        id,
        organizationId: ctx.organizationId,
        firstName: v.firstName,
        lastName: v.lastName,
        jobTitle: v.jobTitle,
        email: nullIfEmpty(v.email),
        phone: nullIfEmpty(v.phone),
        employeeNumber: nullIfEmpty(v.employeeNumber),
        classroomId,
        employmentStatus: v.employmentStatus,
        statusNote: nullIfEmpty(v.statusNote),
        hireDate: nullIfEmpty(v.hireDate),
        pinHash: pin ? await bcrypt.hash(pin, PIN_HASH_ROUNDS) : null,
      }),
      auditInsert(db, {
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "STAFF_CREATED",
        entityType: "staff",
        entityId: id,
        metadata: { jobTitle: v.jobTitle, pinSet: Boolean(pin) },
      }),
    ]);
  } catch (error) {
    employeeNumberTaken(error);
  }
  return { id };
}

export async function updateStaff(db: AppDb, ctx: TenantContext, raw: unknown): Promise<void> {
  assertCan(ctx, "staff:manage");
  const v = updateStaffSchema.parse(raw);
  const existing = await getStaffRow(db, ctx.organizationId, v.staffId);
  if (!existing) throw notFound("Staff member");

  const patch: Partial<typeof existing> = { updatedAt: new Date() };
  if (v.firstName !== undefined) patch.firstName = v.firstName;
  if (v.lastName !== undefined) patch.lastName = v.lastName;
  if (v.jobTitle !== undefined) patch.jobTitle = v.jobTitle;
  if (v.email !== undefined) patch.email = nullIfEmpty(v.email);
  if (v.phone !== undefined) patch.phone = nullIfEmpty(v.phone);
  if (v.employeeNumber !== undefined) patch.employeeNumber = nullIfEmpty(v.employeeNumber);
  if (v.employmentStatus !== undefined) patch.employmentStatus = v.employmentStatus;
  if (v.statusNote !== undefined) patch.statusNote = nullIfEmpty(v.statusNote);
  if (v.hireDate !== undefined) patch.hireDate = nullIfEmpty(v.hireDate);
  if (v.classroomId !== undefined) {
    patch.classroomId = nullIfEmpty(v.classroomId);
    await assertClassroom(db, ctx, patch.classroomId);
  }
  const newPin = nullIfEmpty(v.pin);
  if (newPin) {
    await assertPinAvailable(db, ctx.organizationId, newPin, v.staffId);
    patch.pinHash = await bcrypt.hash(newPin, PIN_HASH_ROUNDS);
  } else if (v.clearPin) {
    patch.pinHash = null;
  }

  const changed = Object.keys(patch).filter((k) => k !== "updatedAt" && k !== "pinHash");
  try {
    await db.batch([
      updateStaffRow(db, ctx.organizationId, v.staffId, patch),
      auditInsert(db, {
        organizationId: ctx.organizationId,
        userId: ctx.user.id,
        action: "STAFF_UPDATED",
        entityType: "staff",
        entityId: v.staffId,
        metadata: {
          fields: changed,
          ...(newPin ? { pinChanged: true } : v.clearPin ? { pinCleared: true } : {}),
          ...(v.employmentStatus && v.employmentStatus !== existing.employmentStatus
            ? { employmentStatus: { from: existing.employmentStatus, to: v.employmentStatus } }
            : {}),
        },
      }),
    ]);
  } catch (error) {
    employeeNumberTaken(error);
  }
}
