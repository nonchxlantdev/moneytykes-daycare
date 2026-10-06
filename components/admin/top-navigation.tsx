"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Building2, Check, ChevronDown, CircleAlert, Menu, Plus, Search, Wallet, UserMinus } from "lucide-react";
import { OrganizationLogo } from "@/components/shared/organization-logo";
import { useOrganization } from "@/components/shared/organization-provider";
import { TenantBrand } from "@/components/shared/tenant-brand";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTodayAlerts, type AlertInputs } from "@/lib/hooks/use-today-alerts";
import { SidebarFooter, SidebarNav } from "./app-sidebar";

const toneIcon = { danger: CircleAlert, warning: Wallet, info: UserMinus } as const;
const toneClass = {
  danger: "bg-danger/12 text-danger",
  warning: "bg-warning/15 text-warning",
  info: "bg-primary/10 text-primary",
} as const;

export function TopNavigation({ alertInputs }: { alertInputs: AlertInputs }) {
  const notifications = useTodayAlerts(alertInputs);
  const router = useRouter();
  const org = useOrganization();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    router.push(q ? `/children?q=${encodeURIComponent(q)}` : "/children");
  };

  return (
    <header className="no-print sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-md">
      <div className="flex h-[72px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent className="px-4 py-6">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="mb-6 px-2">
              <TenantBrand />
            </div>
            <div className="scrollbar-thin flex-1 overflow-y-auto">
              <SidebarNav onNavigate={() => setMenuOpen(false)} />
            </div>
            <div className="mt-4">
              <SidebarFooter />
            </div>
          </SheetContent>
        </Sheet>

        <form onSubmit={onSearch} role="search" className="relative hidden max-w-lg flex-1 sm:block">
          <Search className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search children, parents, staff..."
            aria-label="Search children, parents, staff"
            className="h-11 w-full rounded-xl border border-line bg-surface pr-4 pl-11 text-sm text-ink shadow-soft placeholder:text-ink-subtle focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15"
          />
        </form>

        <div className="flex-1 sm:hidden">
          <TenantBrand size="sm" />
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label={`Notifications (${notifications.length})`}>
                <Bell className="size-5" />
                {notifications.length > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex size-[18px] items-center justify-center rounded-full bg-danger text-[10px] font-bold text-danger-foreground ring-2 ring-canvas">
                    {notifications.length}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Today&apos;s alerts</DropdownMenuLabel>
              {notifications.map((n) => {
                const Icon = toneIcon[n.tone];
                return (
                  <DropdownMenuItem key={n.id} asChild className="items-start py-2.5">
                    <Link href={n.href}>
                      <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg ${toneClass[n.tone]}`}>
                        <Icon className="!text-current" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-ink">{n.title}</span>
                        <span className="block text-xs text-ink-muted">{n.detail}</span>
                      </span>
                    </Link>
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex h-11 items-center gap-2.5 rounded-xl border border-line bg-surface pr-3 pl-2 text-sm font-semibold text-ink shadow-soft hover:bg-muted"
                aria-label="Switch daycare"
              >
                <OrganizationLogo name={org.name} logoUrl={org.branding.logoUrl} size={28} />
                <span className="hidden max-w-40 truncate md:inline">{org.name}</span>
                <ChevronDown className="size-4 text-ink-subtle" aria-hidden="true" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Your daycares</DropdownMenuLabel>
              <DropdownMenuItem>
                <OrganizationLogo name={org.name} logoUrl={org.branding.logoUrl} size={24} />
                <span className="flex-1 truncate">{org.name}</span>
                <Check className="!text-primary" />
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <Building2 />
                Multi-location switching (later)
              </DropdownMenuItem>
              <DropdownMenuItem disabled>
                <Plus />
                Add organization
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
