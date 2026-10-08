import type { TenantContext } from "@/lib/server/tenant-context";
import { DEMO_MEMBERSHIP_ID, DEMO_ORG_ID, DEMO_TZ, DEMO_USER_ID, demoOrganization } from "./fixtures";

/** Fabricated DAYCARE_OWNER context for env-login users in demo mode. */
export function demoTenantContext(identity: { email: string; name: string }): TenantContext {
  return {
    user: {
      id: DEMO_USER_ID,
      email: identity.email,
      name: identity.name,
    },
    organizationId: DEMO_ORG_ID,
    timezone: DEMO_TZ,
    membershipId: DEMO_MEMBERSHIP_ID,
    role: "DAYCARE_OWNER",
  };
}

export function demoMembershipSummary() {
  return [
    {
      organizationId: DEMO_ORG_ID,
      slug: demoOrganization.slug,
      name: demoOrganization.name,
      role: "DAYCARE_OWNER" as const,
    },
  ];
}
