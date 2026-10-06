import Link from "next/link";
import { ChevronRight, CircleAlert, UserMinus, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export type AlertTone = "danger" | "warning" | "info";

const toneStyle: Record<AlertTone, { wrap: string; chip: string; icon: typeof CircleAlert; title: string }> = {
  danger: { wrap: "bg-danger/[0.07] hover:bg-danger/10", chip: "bg-danger text-danger-foreground", icon: CircleAlert, title: "text-[color-mix(in_oklab,var(--brand-danger)_80%,black)]" },
  warning: { wrap: "bg-warning/[0.09] hover:bg-warning/[0.13]", chip: "bg-warning text-warning-foreground", icon: Wallet, title: "text-[color-mix(in_oklab,var(--brand-warning)_65%,black)]" },
  info: { wrap: "bg-primary/[0.07] hover:bg-primary/10", chip: "bg-primary text-primary-foreground", icon: UserMinus, title: "text-ink" },
};

export function AlertCard({ tone, title, detail, href }: { tone: AlertTone; title: string; detail: string; href: string }) {
  const s = toneStyle[tone];
  const Icon = s.icon;
  return (
    <Link href={href} className={cn("flex items-center gap-3 rounded-xl p-3 transition-colors", s.wrap)}>
      <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full", s.chip)}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("block text-sm font-bold", s.title)}>{title}</span>
        <span className="block truncate text-xs text-ink-muted">{detail}</span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink-subtle" aria-hidden="true" />
    </Link>
  );
}
