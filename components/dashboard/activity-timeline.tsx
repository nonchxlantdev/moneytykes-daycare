import { CircleCheck, Info, LogIn, LogOut, UserRound } from "lucide-react";
import { ChildAvatar } from "@/components/shared/child-avatar";
import { cn } from "@/lib/utils";

export type ActivityKind = "CHECK_IN" | "CHECK_OUT" | "CLOCK_IN" | "CLOCK_OUT" | "NOTE";

export interface ActivityItem {
  id: string;
  time: string;
  kind: ActivityKind;
  actor: string;
  action: string;
}

const kindStyle: Record<ActivityKind, { icon: typeof CircleCheck; className: string; label: string }> = {
  CHECK_IN: { icon: CircleCheck, className: "bg-success text-success-foreground", label: "Check-in" },
  CHECK_OUT: { icon: LogOut, className: "bg-brand-accent text-brand-accent-foreground", label: "Check-out" },
  CLOCK_IN: { icon: UserRound, className: "bg-primary text-primary-foreground", label: "Staff clock-in" },
  CLOCK_OUT: { icon: LogIn, className: "bg-ink-subtle text-white", label: "Staff clock-out" },
  NOTE: { icon: Info, className: "bg-muted text-ink-muted", label: "Note" },
};

/** Vertical timeline of operational events. Presentational — works on server or client. */
export function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  return (
    <ol className="relative">
      {items.map((item, i) => {
        const s = kindStyle[item.kind];
        const Icon = s.icon;
        return (
          <li key={item.id} className="relative flex gap-3 pb-4 last:pb-0">
            {i < items.length - 1 && (
              <span aria-hidden="true" className="absolute top-7 bottom-0 left-[11px] w-0.5 rounded-full bg-line" />
            )}
            <span className={cn("relative z-10 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full", s.className)}>
              <Icon className="size-3.5" aria-hidden="true" />
              <span className="sr-only">{s.label}</span>
            </span>
            <span className="w-[62px] shrink-0 pt-1 text-xs font-semibold text-ink-muted tabular">{item.time}</span>
            {item.kind !== "NOTE" && <ChildAvatar name={item.actor} size="xs" className="mt-0.5" />}
            <p className="min-w-0 pt-1 text-sm leading-snug text-ink-muted">
              <span className="font-semibold text-ink">{item.actor}</span> {item.action}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
