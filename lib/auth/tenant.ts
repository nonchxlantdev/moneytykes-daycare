import "server-only";

import { cache } from "react";
import { notFound, redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { AppError, forbidden, unauthenticated } from "@/lib/server/errors";
import type { Permission } from "@/lib/server/permissions";
import {
  NoMembershipError,
  TenantNotFoundError,
  can,
  listUsableMemberships,
  resolveTenantContext,
  type TenantContext,
  type TenantScope,
} from "@/lib/server/tenant-context";
import { tenantUrl } from "@/lib/tenancy/hostname";
import { getRequestTenancy, type RequestTenancy } from "@/lib/tenancy/request";
import { getOptionalIdentity } from "./credentials";

/**
 * Protected request flow (pages, layouts, server actions):
 *
 *   1. authenticate (signed session cookie)            → getOptionalIdentity
 *   2. resolve the tenant slug from the hostname        → getRequestTenancy
 *   3. find the organization by slug, check its status  ┐
 *   4. find the application user                        │ resolveTenantContext
 *   5. require an ACTIVE membership in THAT organization │
 *   6. role → permissions                               ┘
 *   7. services scope every query to ctx.organizationId
 *
 * The hostname only says which daycare is requested; it never grants access.
 */

function scopeOf(tenancy: RequestTenancy): TenantScope | undefined {
  return tenancy.resolution.kind === "tenant" ? { slug: tenancy.resolution.slug } : undefined;
}

/**
 * Where a signed-in user goes from the platform domain (visionforgestudio.app):
 * straight to their daycare when they belong to exactly one.
 */
export async function platformDestination(authProviderId: string, tenancy: RequestTenancy): Promise<string> {
  const memberships = await listUsableMemberships(getDb(), authProviderId);
  if (memberships.length === 0) return "/no-access";
  if (memberships.length === 1 && tenancy.resolution.kind === "platform") {
    return tenantUrl(memberships[0].slug, "/dashboard", { host: tenancy.host, protocol: tenancy.protocol, rootDomain: tenancy.resolution.rootDomain });
  }
  return "/select-daycare";
}

/**
 * For pages and layouts: resolve the tenant context or redirect / 404.
 * Cached per request, so layouts and pages share one lookup.
 */
function isLocalDevHost(host: string): boolean {
  return /(^|\.)localhost(:\d+)?$/i.test(host) || /^127\.0\.0\.1(:\d+)?$/.test(host);
}

export const requireTenantContext = cache(async (): Promise<TenantContext> => {
  const identity = await getOptionalIdentity();
  if (!identity) redirect("/login");

  const tenancy = await getRequestTenancy();
  const { resolution } = tenancy;
  if (resolution.kind === "reserved" || resolution.kind === "invalid") notFound();

  // Localhost is "platform" by hostname rules, but bouncing to a tenant
  // subdomain makes the dashboard feel like it is jumping. Stay here and
  // use the user's oldest usable membership (same as unscoped hosts).
  if (resolution.kind === "platform" && !isLocalDevHost(tenancy.host)) {
    redirect(await platformDestination(identity.authProviderId, tenancy));
  }

  try {
    const scope = resolution.kind === "platform" || resolution.kind === "unscoped" ? undefined : scopeOf(tenancy);
    return await resolveTenantContext(getDb(), identity.authProviderId, scope);
  } catch (error) {
    if (error instanceof TenantNotFoundError) notFound();
    if (error instanceof NoMembershipError) redirect("/no-access");
    throw error;
  }
});

/** For pages that need a specific permission (e.g. /settings). Renders the 403 page otherwise. */
export async function requirePagePermission(permission: Permission): Promise<TenantContext> {
  const ctx = await requireTenantContext();
  if (!can(ctx, permission)) redirect("/forbidden");
  return ctx;
}

/** For server actions: never redirects; throws AppErrors that become safe action results. */
export async function getActionContext(): Promise<TenantContext> {
  const identity = await getOptionalIdentity();
  if (!identity) throw unauthenticated();

  const tenancy = await getRequestTenancy();
  const { resolution } = tenancy;
  if (resolution.kind === "platform") throw forbidden("Open your daycare's own address to make changes.");
  if (resolution.kind === "reserved" || resolution.kind === "invalid") throw new AppError("NOT_FOUND", "Daycare not found.");
  return resolveTenantContext(getDb(), identity.authProviderId, scopeOf(tenancy));
}
