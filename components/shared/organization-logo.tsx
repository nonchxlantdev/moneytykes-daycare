import Image from "next/image";
import { cn, initials } from "@/lib/utils";

interface OrganizationLogoProps {
  name: string;
  logoUrl?: string;
  size?: number;
  className?: string;
}

/**
 * Tenant logo. Falls back to a branded monogram when an organization
 * hasn't uploaded a logo yet. Never renders platform (Vision Forge) marks.
 */
export function OrganizationLogo({ name, logoUrl, size = 44, className }: OrganizationLogoProps) {
  if (logoUrl) {
    return (
      <Image
        src={logoUrl}
        alt={`${name} logo`}
        width={size}
        height={size}
        unoptimized
        className={cn("shrink-0 object-contain", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-label={`${name} logo`}
      role="img"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-brand-secondary font-extrabold text-brand-foreground",
        className,
      )}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}
