import { and, asc, eq, inArray, sql } from "drizzle-orm";
import type { AppDb } from "../client";
import { children } from "../schema";

/** Columns safe for list views — medical/allergy/general notes are deliberately excluded. */
const listColumns = {
  id: children.id,
  organizationId: children.organizationId,
  firstName: children.firstName,
  lastName: children.lastName,
  preferredName: children.preferredName,
  dateOfBirth: children.dateOfBirth,
  classroomId: children.classroomId,
  enrollmentStatus: children.enrollmentStatus,
  enrollmentDate: children.enrollmentDate,
  photoUrl: children.photoUrl,
  hasAllergyAlert: sql<number>`coalesce(length(trim(${children.allergyNotes})), 0) > 0`,
};

type EnrollmentStatus = (typeof children.$inferSelect)["enrollmentStatus"];

export async function listChildren(db: AppDb, organizationId: string, statuses?: EnrollmentStatus[]) {
  return db
    .select(listColumns)
    .from(children)
    .where(and(eq(children.organizationId, organizationId), statuses ? inArray(children.enrollmentStatus, statuses) : undefined))
    .orderBy(asc(children.firstName), asc(children.lastName));
}

export async function getChildRow(db: AppDb, organizationId: string, childId: string) {
  return db.query.children.findFirst({
    where: and(eq(children.id, childId), eq(children.organizationId, organizationId)),
  });
}

export function insertChildRow(db: AppDb, values: typeof children.$inferInsert) {
  return db.insert(children).values(values);
}

export function updateChildRow(db: AppDb, organizationId: string, childId: string, patch: Partial<typeof children.$inferInsert>) {
  return db
    .update(children)
    .set(patch)
    .where(and(eq(children.id, childId), eq(children.organizationId, organizationId)));
}
