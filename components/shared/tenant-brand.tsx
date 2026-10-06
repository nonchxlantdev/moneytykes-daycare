"use client";

import { cn } from "@/lib/utils";
import { useOrganization } from "./organization-provider";
import { OrganizationLogo } from "./organization-logo";

/** Logo + name + tagline for the active organization. */
export function TenantBrand({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  const org = useOrganization();
  const logoSize = { sm: 34, md: 44, lg: 56 }[size];
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <OrganizationLogo name={org.name} logoUrl={org.branding.logoUrl} size={logoSize} />
      <div className="min-w-0">
        <p
          className={cn(
            "truncate font-extrabold tracking-tight text-ink",
            size === "sm" && "text-sm",
            size === "md" && "text-base",
            size === "lg" && "text-xl",
          )}
        >
          {org.name}
        </p>
        <p className={cn("truncate font-medium text-ink-muted", size === "lg" ? "text-sm" : "text-xs")}>{org.tagline}</p>
      </div>
    </div>
  );
}
