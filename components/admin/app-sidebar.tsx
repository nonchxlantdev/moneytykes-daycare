"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LifeBuoy, Tablet } from "lucide-react";
import { AccountMenu } from "./account-menu";
import { TenantBrand } from "@/components/shared/tenant-brand";
import { useViewer } from "@/components/shared/viewer-provider";
import { cn } from "@/lib/utils";
import { primaryNav } from "./nav-items";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { permissions } = useViewer();
  return (
    <nav aria-label="Main" className="flex flex-col gap-1">
      {primaryNav
        .filter((item) => !item.hidden)
        .filter((item) => !item.permission || permissions.includes(item.permission))
        .map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex h-11 items-center gap-3 rounded-xl px-3.5 text-[15px] font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_color-mix(in_oklab,var(--brand-primary)_70%,transparent)]"
                : "text-ink-muted hover:bg-muted hover:text-ink",
            )}
          >
            <Icon className={cn("size-5", !active && "text-ink-subtle group-hover:text-ink")} aria-hidden="true" />
            <span className="flex-1">{item.label}</span>
            {item.later && !active && (
              <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-bold tracking-wide text-ink-subtle uppercase">
                Soon
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarFooter() {
  const viewer = useViewer();
  return (
    <div className="flex flex-col gap-3">
      <Link
        href="/kiosk"
        className="flex items-center gap-3 rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm font-semibold text-ink shadow-soft transition-colors hover:bg-muted"
      >
        <Tablet className="size-5 text-brand-secondary" aria-hidden="true" />
        Open Kiosk Mode
      </Link>
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-brand-secondary/10 p-4">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <LifeBuoy className="size-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink">Need Help?</p>
            <p className="text-xs text-ink-muted">We&apos;re here to support you.</p>
          </div>
        </div>
        <a
          href="mailto:support@example.com"
          className="mt-3 flex h-9 items-center justify-center rounded-lg bg-surface text-sm font-semibold text-primary shadow-soft hover:bg-surface/80"
        >
          Contact Support
        </a>
      </div>
      <div className="border-t border-line px-1 pt-4">
        <AccountMenu user={{ name: viewer.name, roleLabel: viewer.roleLabel }} />
      </div>
    </div>
  );
}

/** Desktop sidebar (≥ lg). Collapsing is planned; layout already isolates width. */
export function AppSidebar() {
  return (
    <aside className="no-print sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col border-r border-line bg-surface px-4 py-6 lg:flex">
      <Link href="/dashboard" className="mb-8 px-2" aria-label="Go to dashboard">
        <TenantBrand />
      </Link>
      <div className="scrollbar-thin -mx-1 flex-1 overflow-y-auto px-1">
        <SidebarNav />
      </div>
      <div className="mt-6">
        <SidebarFooter />
      </div>
    </aside>
  );
}
