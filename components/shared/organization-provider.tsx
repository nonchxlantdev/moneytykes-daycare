"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Organization } from "@/types/domain";
import { brandCssVars } from "@/lib/theme/brand-css-vars";

interface OrganizationContextValue {
  organization: Organization;
  /** The organization as loaded from the server (before any session preview). */
  baseOrganization: Organization;
  /** Session-only preview of branding/settings changes (not persisted). */
  applyOrganizationPreview: (next: Organization) => void;
  resetOrganization: () => void;
  isPreviewing: boolean;
}

const OrganizationContext = createContext<OrganizationContextValue | null>(null);

/**
 * Supplies the active tenant to client components and keeps the
 * --brand-* CSS variables on <html> in sync. The server renders the
 * initial variables inline (app/layout.tsx), so there is no flash.
 */
export function OrganizationProvider({ organization: initial, children }: { organization: Organization; children: ReactNode }) {
  const [organization, setOrganization] = useState<Organization>(initial);

  useEffect(() => {
    const root = document.documentElement;
    for (const [key, value] of Object.entries(brandCssVars(organization.branding))) {
      root.style.setProperty(key, value);
    }
  }, [organization.branding]);

  const applyOrganizationPreview = useCallback((next: Organization) => setOrganization(next), []);
  const resetOrganization = useCallback(() => setOrganization(initial), [initial]);

  const value = useMemo(
    () => ({ organization, baseOrganization: initial, applyOrganizationPreview, resetOrganization, isPreviewing: organization !== initial }),
    [organization, applyOrganizationPreview, resetOrganization, initial],
  );

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>;
}

export function useOrganizationContext(): OrganizationContextValue {
  const ctx = useContext(OrganizationContext);
  if (!ctx) throw new Error("useOrganization must be used inside <OrganizationProvider>");
  return ctx;
}

export function useOrganization(): Organization {
  return useOrganizationContext().organization;
}
