"use client";

import { useNow } from "@/lib/hooks/use-now";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { useOrganization } from "./organization-provider";

/** Current date/time in the organization's timezone (hydration-safe). */
export function LiveClock({ className, timeClassName, dateClassName }: { className?: string; timeClassName?: string; dateClassName?: string }) {
  const now = useNow();
  const { timezone } = useOrganization();
  return (
    <div className={cn("text-right", className)} aria-live="off">
      <p className={cn("text-sm font-semibold text-ink-muted", dateClassName)}>
        {now ? formatDate(now.toISOString(), timezone, "long") : " "}
      </p>
      <p className={cn("text-lg font-bold text-ink tabular", timeClassName)}>
        {now ? formatTime(now.toISOString(), timezone) : " "}
      </p>
    </div>
  );
}
