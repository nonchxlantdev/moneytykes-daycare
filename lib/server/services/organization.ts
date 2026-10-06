import type { AppDb } from "@/lib/db/client";
import { auditInsert } from "@/lib/db/repositories/audit";
import { getOrganizationWithBranding, listClassrooms, updateOrganizationRow, upsertBrandingRow } from "@/lib/db/repositories/organizations";
import { updateBrandingSchema, updateOrganizationSchema } from "@/lib/validation/mutations";
import type { Classroom, Organization } from "@/types/domain";
import { notFound } from "../errors";
import { nullIfEmpty, toClassroom, toOrganization } from "../mappers";
import { assertCan, type TenantContext } from "../tenant-context";

export async function getOrganization(db: AppDb, ctx: TenantContext): Promise<Organization> {
  const found = await getOrganizationWithBranding(db, ctx.organizationId);
  if (!found) throw notFound("Organization");
  return toOrganization(found.organization, found.branding);
}

export async function getClassrooms(db: AppDb, ctx: TenantContext): Promise<Classroom[]> {
  return (await listClassrooms(db, ctx.organizationId)).map(toClassroom);
}

export async function updateOrganizationSettings(db: AppDb, ctx: TenantContext, raw: unknown): Promise<Organization> {
  assertCan(ctx, "settings:manage");
  const v = updateOrganizationSchema.parse(raw);
  const orgPatch = {
    legalName: nullIfEmpty(v.legalName),
    website: nullIfEmpty(v.website),
    timezone: v.timezone,
    currency: v.currency,
    expectedArrivalBy: v.expectedArrivalBy,
    addressLine1: nullIfEmpty(v.addressLine1),
    addressLine2: nullIfEmpty(v.addressLine2),
    city: nullIfEmpty(v.city),
    stateRegion: nullIfEmpty(v.stateRegion),
    postalCode: nullIfEmpty(v.postalCode),
    country: nullIfEmpty(v.country),
    phone: nullIfEmpty(v.phone),
    email: nullIfEmpty(v.email),
    updatedAt: new Date(),
  };
  const brandingPatch = {
    receiptBusinessName: nullIfEmpty(v.receiptBusinessName),
    receiptTaxId: nullIfEmpty(v.receiptTaxId),
    receiptPrefix: v.receiptPrefix,
    receiptFooter: nullIfEmpty(v.receiptFooter),
  };
  await db.batch([
    updateOrganizationRow(db, ctx.organizationId, orgPatch),
    upsertBrandingRow(db, ctx.organizationId, brandingPatch),
    auditInsert(db, {
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "ORGANIZATION_UPDATED",
      entityType: "organization",
      entityId: ctx.organizationId,
      metadata: { fields: Object.keys(v) },
    }),
  ]);
  return getOrganization(db, ctx);
}

export async function updateBranding(db: AppDb, ctx: TenantContext, raw: unknown): Promise<Organization> {
  assertCan(ctx, "branding:manage");
  const v = updateBrandingSchema.parse(raw);
  await db.batch([
    updateOrganizationRow(db, ctx.organizationId, { name: v.name, tagline: v.tagline, updatedAt: new Date() }),
    upsertBrandingRow(db, ctx.organizationId, {
      logoUrl: nullIfEmpty(v.logoUrl),
      primaryColor: v.primaryColor.toLowerCase(),
      secondaryColor: v.secondaryColor.toLowerCase(),
      accentColor: v.accentColor.toLowerCase(),
      kioskWelcomeMessage: v.kioskWelcomeMessage,
    }),
    auditInsert(db, {
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      action: "BRANDING_UPDATED",
      entityType: "organization_branding",
      entityId: ctx.organizationId,
      metadata: { name: v.name, primaryColor: v.primaryColor, secondaryColor: v.secondaryColor, accentColor: v.accentColor },
    }),
  ]);
  return getOrganization(db, ctx);
}
