"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { Organization } from "@/types/domain";
import { brandCssVars } from "@/lib/theme/brand-css-vars";

const OrganizationContext = createContext<Organization | null>(null);

/**
 * Supplies the signed-in user's organization (loaded from D1 by the tenant
 * layout) to client components. There is no client-side copy: after a
 * settings or branding save the server re-renders the layout and the new
 * values flow straight through.
 *
 * The --brand-* variables are rendered on the server around the app; this
 * effect mirrors them onto <html> so portalled UI (dialogs, menus) matches.
 */
export function OrganizationProvider({ organization, children }: { organization: Organization; children: ReactNode }) {
  useEffect(() => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(brandCssVars(organization.branding))) {
      root.style.setProperty(key, value);
    }
  }, [organization.branding]);

  return <OrganizationContext.Provider value={organization}>{children}</OrganizationContext.Provider>;
}

export function useOrganization(): Organization {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganization must be used inside <OrganizationProvider>");
  return ctx;
}
