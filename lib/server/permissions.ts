import type { MembershipRole } from "@/types/domain";

/**
 * Deliberately small RBAC model — enough to prove the architecture.
 * Checked on the SERVER for every protected read and mutation; the UI
 * only mirrors it to hide controls a user can't use.
 */
export const PERMISSIONS = [
  "children:read",
  "children:read-medical",
  "children:write",
  "guardians:read",
  "guardians:write",
  "attendance:read",
  "attendance:record",
  "staff:read",
  "staff:manage",
  "staff-time:record",
  "reports:view",
  "payments:view",
  "settings:manage",
  "branding:manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: readonly Permission[] = PERMISSIONS;

const STAFF_PERMISSIONS: readonly Permission[] = [
  "children:read",
  "guardians:read",
  "attendance:read",
  "attendance:record",
  "staff:read",
  "staff-time:record",
];

export const ROLE_PERMISSIONS: Record<MembershipRole, readonly Permission[]> = {
  /** Platform support access to the organization it is a member of. Platform tools are Phase 3. */
  PLATFORM_ADMIN: ALL,
  DAYCARE_OWNER: ALL,
  DAYCARE_ADMIN: ALL,
  DAYCARE_STAFF: STAFF_PERMISSIONS,
};

export function roleHasPermission(role: MembershipRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_LABELS: Record<MembershipRole, string> = {
  PLATFORM_ADMIN: "Platform Admin",
  DAYCARE_OWNER: "Owner",
  DAYCARE_ADMIN: "Admin",
  DAYCARE_STAFF: "Staff",
};
