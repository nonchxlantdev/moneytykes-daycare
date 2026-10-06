import { and, asc, eq, isNotNull } from "drizzle-orm";
import type { AppDb } from "../client";
import { staff } from "../schema";

export async function listStaffRows(db: AppDb, organizationId: string) {
  return db.query.staff.findMany({
    where: eq(staff.organizationId, organizationId),
    orderBy: [asc(staff.firstName), asc(staff.lastName)],
  });
}

export async function getStaffRow(db: AppDb, organizationId: string, staffId: string) {
  return db.query.staff.findFirst({ where: and(eq(staff.id, staffId), eq(staff.organizationId, organizationId)) });
}

/** Staff with a configured PIN, for server-side PIN verification only. */
export async function listStaffWithPins(db: AppDb, organizationId: string) {
  return db
    .select({ id: staff.id, pinHash: staff.pinHash, employmentStatus: staff.employmentStatus })
    .from(staff)
    .where(and(eq(staff.organizationId, organizationId), isNotNull(staff.pinHash)));
}

export function insertStaffRow(db: AppDb, values: typeof staff.$inferInsert) {
  return db.insert(staff).values(values);
}

export function updateStaffRow(db: AppDb, organizationId: string, staffId: string, patch: Partial<typeof staff.$inferInsert>) {
  return db
    .update(staff)
    .set(patch)
    .where(and(eq(staff.id, staffId), eq(staff.organizationId, organizationId)));
}
