import { eq, inArray } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { getOrganizationWithBranding } from "@/lib/db/repositories/organizations";
import { organizations } from "@/lib/db/schema";
import type { OrganizationBranding } from "@/types/domain";

/** The public face of a daycare, shown on its sign-in page before anyone is authenticated. */
export interface PublicTenant {
  name: string;
  tagline: string;
  branding: OrganizationBranding;
}

const USABLE = ["ACTIVE", "TRIAL"] as const;

function toPublicTenant(
  organization: { name: string; tagline: string },
  branding: { logoUrl: string | null; primaryColor: string; secondaryColor: string; accentColor: string } | null | undefined,
): PublicTenant {
  return {
    name: organization.name,
    tagline: organization.tagline,
    branding: {
      logoUrl: branding?.logoUrl ?? undefined,
      primaryColor: branding?.primaryColor ?? "#2f6bea",
      secondaryColor: branding?.secondaryColor ?? "#7c4dff",
      accentColor: branding?.accentColor ?? "#f28c28",
    },
  };
}

/**
 * Look up a daycare by its subdomain slug for UNAUTHENTICATED screens
 * (sign-in page, "Daycare not found"). Returns only non-sensitive branding,
 * and null for unknown or inactive organizations. This is NOT authorization.
 */
export async function getPublicTenantBySlug(db: AppDb, slug: string): Promise<PublicTenant | null> {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.slug, slug),
    columns: { id: true, status: true },
  });
  if (!org || !(USABLE as readonly string[]).includes(org.status)) return null;
  const found = await getOrganizationWithBranding(db, org.id);
  if (!found) return null;
  return toPublicTenant(found.organization, found.branding);
}

/**
 * Oldest usable daycare — used for the post-login welcome animation when
 * signing in on the platform/localhost host (no tenant subdomain).
 */
export async function getPrimaryPublicTenant(db: AppDb): Promise<PublicTenant | null> {
  const org = await db.query.organizations.findFirst({
    where: inArray(organizations.status, [...USABLE]),
    orderBy: (row, { asc: orderAsc }) => [orderAsc(row.createdAt)],
    columns: { id: true },
  });
  if (!org) return null;
  const found = await getOrganizationWithBranding(db, org.id);
  if (!found) return null;
  return toPublicTenant(found.organization, found.branding);
}
