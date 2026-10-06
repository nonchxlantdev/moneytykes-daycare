import type { AppDb } from "@/lib/db/client";
import { auditInsert } from "@/lib/db/repositories/audit";
import { getChildRow } from "@/lib/db/repositories/children";
import {
  clearPrimaryRow,
  deleteLinkRow,
  findLink,
  getGuardianRow,
  getLinkRow,
  insertGuardianRow,
  insertLinkRow,
  searchGuardians as searchGuardianRows,
  updateGuardianRow,
  updateLinkRow,
} from "@/lib/db/repositories/guardians";
import {
  createGuardianSchema,
  linkGuardianSchema,
  unlinkGuardianSchema,
  updateGuardianLinkSchema,
  updateGuardianSchema,
} from "@/lib/validation/mutations";
import { AppError, notFound } from "../errors";
import { nullIfEmpty } from "../mappers";
import { assertCan, type TenantContext } from "../tenant-context";

function auditBase(ctx: TenantContext) {
  return { organizationId: ctx.organizationId, userId: ctx.user.id };
}

async function requireChild(db: AppDb, ctx: TenantContext, childId: string) {
  const child = await getChildRow(db, ctx.organizationId, childId);
  if (!child) throw notFound("Child");
  return child;
}

export async function createGuardian(db: AppDb, ctx: TenantContext, raw: unknown): Promise<{ id: string }> {
  assertCan(ctx, "guardians:write");
  const v = createGuardianSchema.parse(raw);
  if (v.link) await requireChild(db, ctx, v.link.childId);

  const guardianId = crypto.randomUUID();
  const insert = insertGuardianRow(db, {
    id: guardianId,
    organizationId: ctx.organizationId,
    firstName: v.firstName,
    lastName: v.lastName,
    phone: v.phone,
    email: nullIfEmpty(v.email),
    alternatePhone: nullIfEmpty(v.alternatePhone),
    address: nullIfEmpty(v.address),
  });
  const audit = auditInsert(db, {
    ...auditBase(ctx),
    action: "GUARDIAN_CREATED",
    entityType: "guardian",
    entityId: guardianId,
    metadata: v.link ? { linkedChildId: v.link.childId } : undefined,
  });

  if (!v.link) {
    await db.batch([insert, audit]);
    return { id: guardianId };
  }
  const link = v.link;
  const linkInsert = insertLinkRow(db, {
    organizationId: ctx.organizationId,
    childId: link.childId,
    guardianId,
    relationship: link.relationship,
    isPrimary: link.isPrimary,
    authorizedPickup: link.authorizedPickup,
    emergencyContact: link.emergencyContact,
  });
  if (link.isPrimary) await db.batch([insert, clearPrimaryRow(db, ctx.organizationId, link.childId), linkInsert, audit]);
  else await db.batch([insert, linkInsert, audit]);
  return { id: guardianId };
}

export async function updateGuardian(db: AppDb, ctx: TenantContext, raw: unknown): Promise<void> {
  assertCan(ctx, "guardians:write");
  const v = updateGuardianSchema.parse(raw);
  if (!(await getGuardianRow(db, ctx.organizationId, v.guardianId))) throw notFound("Guardian");
  await db.batch([
    updateGuardianRow(db, ctx.organizationId, v.guardianId, {
      firstName: v.firstName,
      lastName: v.lastName,
      phone: v.phone,
      email: nullIfEmpty(v.email),
      alternatePhone: nullIfEmpty(v.alternatePhone),
      address: nullIfEmpty(v.address),
      updatedAt: new Date(),
    }),
    auditInsert(db, { ...auditBase(ctx), action: "GUARDIAN_UPDATED", entityType: "guardian", entityId: v.guardianId }),
  ]);
}

export async function linkGuardian(db: AppDb, ctx: TenantContext, raw: unknown): Promise<{ id: string }> {
  assertCan(ctx, "guardians:write");
  const v = linkGuardianSchema.parse(raw);
  await requireChild(db, ctx, v.childId);
  if (!(await getGuardianRow(db, ctx.organizationId, v.guardianId))) throw notFound("Guardian");
  if (await findLink(db, ctx.organizationId, v.childId, v.guardianId)) {
    throw new AppError("CONFLICT", "This guardian is already linked to the child.");
  }
  const id = crypto.randomUUID();
  const insert = insertLinkRow(db, {
    id,
    organizationId: ctx.organizationId,
    childId: v.childId,
    guardianId: v.guardianId,
    relationship: v.relationship,
    isPrimary: v.isPrimary,
    authorizedPickup: v.authorizedPickup,
    emergencyContact: v.emergencyContact,
  });
  const audit = auditInsert(db, {
    ...auditBase(ctx),
    action: "GUARDIAN_LINKED",
    entityType: "child_guardian",
    entityId: id,
    metadata: { childId: v.childId, guardianId: v.guardianId, relationship: v.relationship },
  });
  if (v.isPrimary) await db.batch([clearPrimaryRow(db, ctx.organizationId, v.childId), insert, audit]);
  else await db.batch([insert, audit]);
  return { id };
}

export async function updateGuardianLink(db: AppDb, ctx: TenantContext, raw: unknown): Promise<void> {
  assertCan(ctx, "guardians:write");
  const v = updateGuardianLinkSchema.parse(raw);
  const link = await getLinkRow(db, ctx.organizationId, v.linkId);
  if (!link) throw notFound("Guardian relationship");
  const patch = {
    ...(v.relationship !== undefined && { relationship: v.relationship }),
    ...(v.isPrimary !== undefined && { isPrimary: v.isPrimary }),
    ...(v.authorizedPickup !== undefined && { authorizedPickup: v.authorizedPickup }),
    ...(v.emergencyContact !== undefined && { emergencyContact: v.emergencyContact }),
    updatedAt: new Date(),
  };
  const update = updateLinkRow(db, ctx.organizationId, v.linkId, patch);
  const audit = auditInsert(db, {
    ...auditBase(ctx),
    action: "GUARDIAN_LINK_UPDATED",
    entityType: "child_guardian",
    entityId: v.linkId,
    metadata: { childId: link.childId, changes: Object.keys(patch).filter((k) => k !== "updatedAt") },
  });
  if (v.isPrimary) await db.batch([clearPrimaryRow(db, ctx.organizationId, link.childId), update, audit]);
  else await db.batch([update, audit]);
}

/** Removes the relationship only. The guardian record is kept — they may be linked to other children. */
export async function unlinkGuardian(db: AppDb, ctx: TenantContext, raw: unknown): Promise<void> {
  assertCan(ctx, "guardians:write");
  const v = unlinkGuardianSchema.parse(raw);
  const link = await getLinkRow(db, ctx.organizationId, v.linkId);
  if (!link) throw notFound("Guardian relationship");
  await db.batch([
    deleteLinkRow(db, ctx.organizationId, v.linkId),
    auditInsert(db, {
      ...auditBase(ctx),
      action: "GUARDIAN_UNLINKED",
      entityType: "child_guardian",
      entityId: v.linkId,
      metadata: { childId: link.childId, guardianId: link.guardianId },
    }),
  ]);
}

export async function searchGuardians(db: AppDb, ctx: TenantContext, query: string) {
  assertCan(ctx, "guardians:read");
  if (query.trim().length < 2) return [];
  return searchGuardianRows(db, ctx.organizationId, query.slice(0, 60));
}
