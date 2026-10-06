import { and, asc, eq, inArray, like, or } from "drizzle-orm";
import type { AppDb } from "../client";
import { childGuardians, guardians } from "../schema";

/** Guardian links for list views: name, phone and relationship flags — no email/address. */
export async function listLinksForChildren(db: AppDb, organizationId: string, childIds?: string[]) {
  if (childIds && childIds.length === 0) return [];
  return db
    .select({
      link: childGuardians,
      guardian: {
        id: guardians.id,
        organizationId: guardians.organizationId,
        firstName: guardians.firstName,
        lastName: guardians.lastName,
        phone: guardians.phone,
      },
    })
    .from(childGuardians)
    .innerJoin(guardians, and(eq(guardians.id, childGuardians.guardianId), eq(guardians.organizationId, organizationId)))
    .where(and(eq(childGuardians.organizationId, organizationId), childIds ? inArray(childGuardians.childId, childIds) : undefined))
    .orderBy(asc(childGuardians.createdAt));
}

/** Full guardian contact details for one child's profile. */
export async function listGuardiansForChild(db: AppDb, organizationId: string, childId: string) {
  return db
    .select({ link: childGuardians, guardian: guardians })
    .from(childGuardians)
    .innerJoin(guardians, and(eq(guardians.id, childGuardians.guardianId), eq(guardians.organizationId, organizationId)))
    .where(and(eq(childGuardians.organizationId, organizationId), eq(childGuardians.childId, childId)))
    .orderBy(asc(childGuardians.createdAt));
}

export async function getGuardianRow(db: AppDb, organizationId: string, guardianId: string) {
  return db.query.guardians.findFirst({ where: and(eq(guardians.id, guardianId), eq(guardians.organizationId, organizationId)) });
}

export async function searchGuardians(db: AppDb, organizationId: string, query: string, limit = 10) {
  const q = `%${query.trim().replace(/[%_]/g, "")}%`;
  return db
    .select({ id: guardians.id, firstName: guardians.firstName, lastName: guardians.lastName, phone: guardians.phone })
    .from(guardians)
    .where(
      and(
        eq(guardians.organizationId, organizationId),
        or(like(guardians.firstName, q), like(guardians.lastName, q), like(guardians.phone, q)),
      ),
    )
    .orderBy(asc(guardians.lastName), asc(guardians.firstName))
    .limit(limit);
}

export function insertGuardianRow(db: AppDb, values: typeof guardians.$inferInsert) {
  return db.insert(guardians).values(values);
}

export function updateGuardianRow(db: AppDb, organizationId: string, guardianId: string, patch: Partial<typeof guardians.$inferInsert>) {
  return db
    .update(guardians)
    .set(patch)
    .where(and(eq(guardians.id, guardianId), eq(guardians.organizationId, organizationId)));
}

export async function getLinkRow(db: AppDb, organizationId: string, linkId: string) {
  return db.query.childGuardians.findFirst({ where: and(eq(childGuardians.id, linkId), eq(childGuardians.organizationId, organizationId)) });
}

export async function findLink(db: AppDb, organizationId: string, childId: string, guardianId: string) {
  return db.query.childGuardians.findFirst({
    where: and(
      eq(childGuardians.organizationId, organizationId),
      eq(childGuardians.childId, childId),
      eq(childGuardians.guardianId, guardianId),
    ),
  });
}

export function insertLinkRow(db: AppDb, values: typeof childGuardians.$inferInsert) {
  return db.insert(childGuardians).values(values);
}

export function updateLinkRow(db: AppDb, organizationId: string, linkId: string, patch: Partial<typeof childGuardians.$inferInsert>) {
  return db
    .update(childGuardians)
    .set(patch)
    .where(and(eq(childGuardians.id, linkId), eq(childGuardians.organizationId, organizationId)));
}

/** Used before setting a new primary so each child keeps at most one. */
export function clearPrimaryRow(db: AppDb, organizationId: string, childId: string) {
  return db
    .update(childGuardians)
    .set({ isPrimary: false, updatedAt: new Date() })
    .where(and(eq(childGuardians.organizationId, organizationId), eq(childGuardians.childId, childId)));
}

/** Removes only the relationship; the guardian record itself is kept (they may have other children). */
export function deleteLinkRow(db: AppDb, organizationId: string, linkId: string) {
  return db.delete(childGuardians).where(and(eq(childGuardians.id, linkId), eq(childGuardians.organizationId, organizationId)));
}
