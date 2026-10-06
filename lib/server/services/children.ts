import type { AppDb } from "@/lib/db/client";
import { auditInsert } from "@/lib/db/repositories/audit";
import { getChildRow, insertChildRow, listChildren, updateChildRow } from "@/lib/db/repositories/children";
import { insertGuardianRow, insertLinkRow, listGuardiansForChild, listLinksForChildren } from "@/lib/db/repositories/guardians";
import { classroomBelongsToOrg } from "@/lib/db/repositories/organizations";
import { createChildSchema, setChildStatusSchema, updateChildSchema } from "@/lib/validation/mutations";
import type { ChildRecord, EnrollmentStatus, GuardianLink } from "@/types/domain";
import { AppError, forbidden, notFound } from "../errors";
import { nullIfEmpty, toChildGuardian, toChildListItem, toChildProfile, toGuardian } from "../mappers";
import { assertCan, can, type TenantContext } from "../tenant-context";

export async function listChildRecords(db: AppDb, ctx: TenantContext, statuses?: EnrollmentStatus[]): Promise<ChildRecord[]> {
  assertCan(ctx, "children:read");
  const [rows, links] = await Promise.all([
    listChildren(db, ctx.organizationId, statuses),
    listLinksForChildren(db, ctx.organizationId),
  ]);
  const byChild = new Map<string, GuardianLink[]>();
  for (const { link, guardian } of links) {
    const list = byChild.get(link.childId) ?? [];
    list.push({ link: toChildGuardian(link), guardian: toGuardian(guardian) });
    byChild.set(link.childId, list);
  }
  return rows.map((r) => ({ ...toChildListItem(r), guardians: byChild.get(r.id) ?? [] }));
}

export async function getChildProfile(db: AppDb, ctx: TenantContext, childId: string): Promise<ChildRecord | null> {
  assertCan(ctx, "children:read");
  const row = await getChildRow(db, ctx.organizationId, childId);
  if (!row) return null;
  const links = can(ctx, "guardians:read") ? await listGuardiansForChild(db, ctx.organizationId, childId) : [];
  return {
    ...toChildProfile(row, can(ctx, "children:read-medical")),
    guardians: links.map(({ link, guardian }) => ({ link: toChildGuardian(link), guardian: toGuardian(guardian) })),
  };
}

async function assertClassroom(db: AppDb, ctx: TenantContext, classroomId: string | null | undefined) {
  if (classroomId && !(await classroomBelongsToOrg(db, ctx.organizationId, classroomId))) {
    throw new AppError("VALIDATION", "Choose a valid class.", { classroomId: "Choose a valid class" });
  }
}

export async function createChild(db: AppDb, ctx: TenantContext, raw: unknown): Promise<{ id: string }> {
  assertCan(ctx, "children:write");
  const v = createChildSchema.parse(raw);
  const classroomId = nullIfEmpty(v.classroomId);
  await assertClassroom(db, ctx, classroomId);

  const childId = crypto.randomUUID();
  const audit = { organizationId: ctx.organizationId, userId: ctx.user.id };
  const childInsert = insertChildRow(db, {
    id: childId,
    organizationId: ctx.organizationId,
    firstName: v.firstName,
    lastName: v.lastName,
    preferredName: nullIfEmpty(v.preferredName),
    dateOfBirth: v.dateOfBirth,
    classroomId,
    enrollmentStatus: v.enrollmentStatus,
    enrollmentDate: nullIfEmpty(v.enrollmentDate) ?? new Date().toISOString().slice(0, 10),
    allergyNotes: nullIfEmpty(v.allergyNotes),
    medicalNotes: nullIfEmpty(v.medicalNotes),
    generalNotes: nullIfEmpty(v.generalNotes),
  });
  const childAudit = auditInsert(db, { ...audit, action: "CHILD_CREATED", entityType: "child", entityId: childId, metadata: { enrollmentStatus: v.enrollmentStatus } });

  if (v.guardian) {
    const guardianId = crypto.randomUUID();
    await db.batch([
      childInsert,
      insertGuardianRow(db, {
        id: guardianId,
        organizationId: ctx.organizationId,
        firstName: v.guardian.firstName,
        lastName: v.guardian.lastName,
        phone: v.guardian.phone,
        email: nullIfEmpty(v.guardian.email),
      }),
      insertLinkRow(db, {
        organizationId: ctx.organizationId,
        childId,
        guardianId,
        relationship: v.guardian.relationship,
        isPrimary: true,
        authorizedPickup: true,
        emergencyContact: true,
      }),
      childAudit,
      auditInsert(db, { ...audit, action: "GUARDIAN_CREATED", entityType: "guardian", entityId: guardianId, metadata: { linkedChildId: childId } }),
    ]);
  } else {
    await db.batch([childInsert, childAudit]);
  }
  return { id: childId };
}

export async function updateChild(db: AppDb, ctx: TenantContext, raw: unknown): Promise<void> {
  assertCan(ctx, "children:write");
  const v = updateChildSchema.parse(raw);
  if (v.medicalNotes !== undefined && !can(ctx, "children:read-medical")) throw forbidden("You can't edit medical notes.");
  const existing = await getChildRow(db, ctx.organizationId, v.childId);
  if (!existing) throw notFound("Child");
  if (v.classroomId !== undefined) await assertClassroom(db, ctx, nullIfEmpty(v.classroomId));

  const patch: Partial<typeof existing> = { updatedAt: new Date() };
  if (v.firstName !== undefined) patch.firstName = v.firstName;
  if (v.lastName !== undefined) patch.lastName = v.lastName;
  if (v.preferredName !== undefined) patch.preferredName = nullIfEmpty(v.preferredName);
  if (v.dateOfBirth !== undefined) patch.dateOfBirth = v.dateOfBirth;
  if (v.classroomId !== undefined) patch.classroomId = nullIfEmpty(v.classroomId);
  if (v.enrollmentDate !== undefined) patch.enrollmentDate = nullIfEmpty(v.enrollmentDate);
  if (v.allergyNotes !== undefined) patch.allergyNotes = nullIfEmpty(v.allergyNotes);
  if (v.medicalNotes !== undefined) patch.medicalNotes = nullIfEmpty(v.medicalNotes);
  if (v.generalNotes !== undefined) patch.generalNotes = nullIfEmpty(v.generalNotes);

  await db.batch([
    updateChildRow(db, ctx.organizationId, v.childId, patch),
    auditInsert(db, {
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "CHILD_UPDATED",
      entityType: "child",
      entityId: v.childId,
      // Field names only — never the (possibly medical) values.
      metadata: { fields: Object.keys(patch).filter((k) => k !== "updatedAt") },
    }),
  ]);
}

/** Soft lifecycle change — children are never hard-deleted in normal operation. */
export async function setChildStatus(db: AppDb, ctx: TenantContext, raw: unknown): Promise<void> {
  assertCan(ctx, "children:write");
  const v = setChildStatusSchema.parse(raw);
  const existing = await getChildRow(db, ctx.organizationId, v.childId);
  if (!existing) throw notFound("Child");
  if (existing.enrollmentStatus === v.enrollmentStatus) return;
  await db.batch([
    updateChildRow(db, ctx.organizationId, v.childId, { enrollmentStatus: v.enrollmentStatus, updatedAt: new Date() }),
    auditInsert(db, {
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "CHILD_STATUS_CHANGED",
      entityType: "child",
      entityId: v.childId,
      metadata: { from: existing.enrollmentStatus, to: v.enrollmentStatus },
    }),
  ]);
}
