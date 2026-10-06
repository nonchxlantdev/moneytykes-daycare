/**
 * ⚠️ DEMO AUTHENTICATION — NOT SECURE, NOT FOR PRODUCTION.
 *
 * Returns a hard-coded signed-in admin so the prototype can render.
 * Production replaces this with real sessions (see README → Authentication
 * plan): server-validated session, organization membership + role checks
 * on every protected query/mutation.
 */
import type { OrganizationRole, User } from "@/types/domain";

export interface DemoSession {
  user: User;
  role: OrganizationRole;
  organizationId: string;
  isDemo: true;
}

export async function getDemoSession(): Promise<DemoSession> {
  return {
    user: { id: "usr_sarah_johnson", name: "Sarah Johnson", email: "sarah@littlestars.example" },
    role: "ADMIN",
    organizationId: "org_little_stars",
    isDemo: true,
  };
}
