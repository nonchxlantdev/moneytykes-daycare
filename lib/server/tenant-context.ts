import { and, asc, eq, inArray } from "drizzle-orm";
import type { AppDb } from "@/lib/db/client";
import { organizationMemberships, organizations, users } from "@/lib/db/schema";
import type { MembershipRole } from "@/types/domain";
import { AppError, forbidden, unauthenticated } from "./errors";
import { roleHasPermission, type Permission } from "./permissions";

/**
 * Who is acting, for which organization, with which role — derived ONLY
 * from the authenticated identity and the database. Never from an
 * organizationId supplied by the browser.
 *
 *   authenticated identity → users.auth_provider_id → user
 *     → ACTIVE membership → ACTIVE/TRIAL organization → role
 */
export interface TenantContext {
  user: { id: string; email: string; name: string };
  organizationId: string;
  /** IANA timezone of the organization — defines "today" for attendance and the time clock. */
  timezone: string;
  membershipId: string;
  role: MembershipRole;
}

const USABLE_ORG_STATUSES = ["ACTIVE", "TRIAL"] as const;

export class NoMembershipError extends AppError {
  constructor() {
    super("FORBIDDEN", "Your account isn't linked to a daycare yet. Ask an administrator to invite you.");
  }
}

/** The requested daycare (from the hostname) doesn't exist or isn't active. */
export class TenantNotFoundError extends AppError {
  constructor() {
    super("NOT_FOUND", "Daycare not found.");
  }
}

/**
 * Which organization the request is for.
 *   { slug }  — from the hostname (mydaycare.visionforgestudio.app). The user
 *               must hold an ACTIVE membership in exactly that organization.
 *   undefined — no tenant in the hostname (pre-cutover *.workers.dev / Vercel
 *               URLs and tests): the user's oldest ACTIVE membership is used.
 */
export interface TenantScope {
  slug: string;
}

export async function resolveTenantContext(
  db: AppDb,
  authProviderId: string | null | undefined,
  scope?: TenantScope,
): Promise<TenantContext> {
  if (!authProviderId) throw unauthenticated();

  // Tenant from the hostname: the organization must exist and be usable
  // BEFORE we look at the user, so an unknown daycare never falls back to
  // another one.
  let requestedOrgId: string | undefined;
  if (scope) {
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.slug, scope.slug),
      columns: { id: true, status: true },
    });
    if (!org || !(USABLE_ORG_STATUSES as readonly string[]).includes(org.status)) throw new TenantNotFoundError();
    requestedOrgId = org.id;
  }

  const user = await db.query.users.findFirst({ where: eq(users.authProviderId, authProviderId) });
  if (!user || user.status !== "ACTIVE") throw new NoMembershipError();

  // Single-tenant UX for now: the oldest active membership wins. Organization
  // switching (validated against memberships) can be layered on later.
  const [membership] = await db
    .select({
      id: organizationMemberships.id,
      role: organizationMemberships.role,
      organizationId: organizationMemberships.organizationId,
      timezone: organizations.timezone,
    })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
    .where(
      and(
        eq(organizationMemberships.userId, user.id),
        eq(organizationMemberships.status, "ACTIVE"),
        inArray(organizations.status, USABLE_ORG_STATUSES),
        requestedOrgId ? eq(organizationMemberships.organizationId, requestedOrgId) : undefined,
      ),
    )
    .orderBy(asc(organizationMemberships.createdAt))
    .limit(1);

  if (!membership) throw new NoMembershipError();

  return {
    user: { id: user.id, email: user.email, name: `${user.firstName} ${user.lastName}`.trim() },
    organizationId: membership.organizationId,
    timezone: membership.timezone,
    membershipId: membership.id,
    role: membership.role,
  };
}

export interface MembershipSummary {
  organizationId: string;
  slug: string;
  name: string;
  role: MembershipRole;
}

/** The daycares this identity may open (ACTIVE membership, ACTIVE/TRIAL organization), oldest first. */
export async function listUsableMemberships(db: AppDb, authProviderId: string): Promise<MembershipSummary[]> {
  const user = await db.query.users.findFirst({ where: eq(users.authProviderId, authProviderId), columns: { id: true, status: true } });
  if (!user || user.status !== "ACTIVE") return [];
  return db
    .select({
      organizationId: organizations.id,
      slug: organizations.slug,
      name: organizations.name,
      role: organizationMemberships.role,
    })
    .from(organizationMemberships)
    .innerJoin(organizations, eq(organizations.id, organizationMemberships.organizationId))
    .where(
      and(
        eq(organizationMemberships.userId, user.id),
        eq(organizationMemberships.status, "ACTIVE"),
        inArray(organizations.status, USABLE_ORG_STATUSES),
      ),
    )
    .orderBy(asc(organizationMemberships.createdAt));
}

export function can(ctx: TenantContext, permission: Permission): boolean {
  return roleHasPermission(ctx.role, permission);
}

export function assertCan(ctx: TenantContext, permission: Permission): void {
  if (!can(ctx, permission)) throw forbidden();
}
