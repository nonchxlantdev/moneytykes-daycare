"use client";

import Link from "next/link";
import { ChevronRight, Clock, CreditCard, LogIn, LogOut } from "lucide-react";
import { useCan } from "@/components/shared/viewer-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const actions = [
  { href: "/kiosk/check-in", label: "Check In Child", icon: LogIn, tone: "bg-success/10 text-[color-mix(in_oklab,var(--brand-success)_80%,black)] hover:bg-success/15", chip: "bg-success text-success-foreground" },
  { href: "/kiosk/check-out", label: "Check Out Child", icon: LogOut, tone: "bg-primary/10 text-primary hover:bg-primary/15", chip: "bg-primary text-primary-foreground" },
  { href: "/kiosk/staff", label: "Staff Time Clock", icon: Clock, tone: "bg-brand-secondary/10 text-brand-secondary hover:bg-brand-secondary/15", chip: "bg-brand-secondary text-brand-secondary-foreground" },
  { href: "/payments?record=1", label: "Record Payment", permission: "payments:view", icon: CreditCard, tone: "bg-brand-accent/12 text-[color-mix(in_oklab,var(--brand-accent)_75%,black)] hover:bg-brand-accent/18", chip: "bg-brand-accent text-brand-accent-foreground" },
] as const;

export function QuickActions() {
  const canPayments = useCan("payments:view");
  const visible = actions.filter((a) => !("permission" in a) || canPayments);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-1">
          {visible.map(({ href, label, icon: Icon, tone, chip }) => (
            <li key={href}>
              <Link
                href={href}
                className={cn("flex h-14 items-center gap-3 rounded-xl px-3 font-bold transition-colors", tone)}
              >
                <span className={cn("flex size-9 items-center justify-center rounded-lg", chip)}>
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="flex-1">{label}</span>
                <ChevronRight className="size-5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
