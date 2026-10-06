/**
 * Tenant-facing session for the current demo organization.
 * Identity comes from the signed-in platform user. Organization membership
 * and role checks against D1 replace the fixed ADMIN role later.
 */
import type { OrganizationRole, User } from "@/types/domain";
import { getCurrentUser } from "@/lib/auth/credentials";

export interface DemoSession {
  user: User;
  role: OrganizationRole;
  organizationId: string;
  isDemo: true;
}

export async function getDemoSession(): Promise<DemoSession> {
  const user = await getCurrentUser();
  return {
    user: { id: user.id, name: user.name, email: user.email },
    role: user.role,
    organizationId: user.organizationId,
    isDemo: true,
  };
}
