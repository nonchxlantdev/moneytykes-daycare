import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import { unauthenticated } from "@/lib/server/errors";
import type { Permission } from "@/lib/server/permissions";
import { NoMembershipError, can, resolveTenantContext, type TenantContext } from "@/lib/server/tenant-context";
import { getOptionalIdentity } from "./credentials";

/**
 * For pages and layouts: resolve the tenant context or redirect.
 * Cached per request, so layouts and pages share one lookup.
 */
export const requireTenantContext = cache(async (): Promise<TenantContext> => {
  const identity = await getOptionalIdentity();
  if (!identity) redirect("/login");
  try {
    return await resolveTenantContext(getDb(), identity.authProviderId);
  } catch (error) {
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
  return resolveTenantContext(getDb(), identity.authProviderId);
}
