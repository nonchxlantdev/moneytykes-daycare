import type { ReactNode } from "react";
import { FlaskConical } from "lucide-react";
import { cn } from "@/lib/utils";

/** Clearly marks mock/demo behaviour (auth, persistence) in the UI. */
export function DemoBadge({ children = "Demo mode", className }: { children?: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-dashed border-warning/60 bg-warning/10 px-2.5 py-1 text-[11px] font-bold tracking-wide text-[color-mix(in_oklab,var(--brand-warning)_65%,black)] uppercase",
        className,
      )}
    >
      <FlaskConical className="size-3.5" aria-hidden="true" />
      {children}
    </span>
  );
}
