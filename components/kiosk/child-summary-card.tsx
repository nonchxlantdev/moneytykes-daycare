import type { ReactNode } from "react";
import { ChildAvatar } from "@/components/shared/child-avatar";
import { cn } from "@/lib/utils";

/** Large child identity card used on kiosk confirmation screens. */
export function ChildSummaryCard({
  name,
  photoUrl,
  rows,
  className,
}: {
  name: string;
  photoUrl?: string;
  rows: Array<{ label: string; value: ReactNode }>;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-6 rounded-[2rem] border border-line bg-surface p-6 shadow-soft sm:flex-row sm:items-center sm:p-8", className)}>
      <ChildAvatar name={name} photoUrl={photoUrl} size="2xl" className="sm:size-36 sm:text-5xl" />
      <div className="w-full min-w-0 text-center sm:text-left">
        <h2 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{name}</h2>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-8 gap-y-2 text-left text-lg">
          {rows.map((r) => (
            <div key={r.label} className="contents">
              <dt className="text-ink-muted">{r.label}</dt>
              <dd className="font-bold text-ink">{r.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}
