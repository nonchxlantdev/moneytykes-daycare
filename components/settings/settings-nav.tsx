"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Palette } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/settings", label: "Organization", icon: Building2 },
  { href: "/settings/branding", label: "Branding", icon: Palette },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Settings sections" className="flex gap-1 rounded-xl bg-muted p-1">
      {items.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={pathname === href ? "page" : undefined}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-colors",
            pathname === href ? "bg-surface text-ink shadow-soft" : "text-ink-muted hover:text-ink",
          )}
        >
          <Icon className="size-4" aria-hidden="true" /> {label}
        </Link>
      ))}
    </nav>
  );
}
