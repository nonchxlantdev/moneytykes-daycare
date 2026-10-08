import type { PublicTenant } from "@/lib/server/services/public-tenant";
import { demoOrganization } from "./fixtures";

export function demoPublicTenant(): PublicTenant {
  return {
    name: demoOrganization.name,
    tagline: demoOrganization.tagline,
    branding: demoOrganization.branding,
  };
}
