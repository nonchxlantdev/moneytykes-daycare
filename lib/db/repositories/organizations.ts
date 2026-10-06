import { eq } from "drizzle-orm";
import type { AppDb } from "../client";
import { classrooms, organizationBranding, organizations } from "../schema";

export async function getOrganizationWithBranding(db: AppDb, organizationId: string) {
  const [org, branding] = await db.batch([
    db.select().from(organizations).where(eq(organizations.id, organizationId)).limit(1),
    db.select().from(organizationBranding).where(eq(organizationBranding.organizationId, organizationId)).limit(1),
  ]);
  return org[0] ? { organization: org[0], branding: branding[0] } : null;
}

export function updateOrganizationRow(db: AppDb, organizationId: string, patch: Partial<typeof organizations.$inferInsert>) {
  return db.update(organizations).set(patch).where(eq(organizations.id, organizationId));
}

/** Branding is one-to-one; upsert keyed by the unique organization_id. */
export function upsertBrandingRow(db: AppDb, organizationId: string, patch: Partial<typeof organizationBranding.$inferInsert>) {
  return db
    .insert(organizationBranding)
    .values({ organizationId, ...patch })
    .onConflictDoUpdate({ target: organizationBranding.organizationId, set: { ...patch, updatedAt: new Date() } });
}

export async function listClassrooms(db: AppDb, organizationId: string) {
  return db.query.classrooms.findMany({
    where: eq(classrooms.organizationId, organizationId),
    orderBy: (c, { asc }) => [asc(c.sortOrder), asc(c.name)],
  });
}

export async function classroomBelongsToOrg(db: AppDb, organizationId: string, classroomId: string) {
  const row = await db.query.classrooms.findFirst({
    where: (c, { and }) => and(eq(c.id, classroomId), eq(c.organizationId, organizationId)),
    columns: { id: true },
  });
  return Boolean(row);
}
