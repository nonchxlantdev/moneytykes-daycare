import { cn } from "@/lib/utils";

/** Neutral shimmer block used by route-level loading states. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

/** Generic page skeleton: header, a row of cards and a table-like block. */
export function PageSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
      <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-11" />
        ))}
      </div>
    </div>
  );
}

export function KioskSkeleton() {
  return (
    <div className="flex flex-1 flex-col items-center gap-6 pt-6" role="status" aria-live="polite">
      <span className="sr-only">Loading…</span>
      <Skeleton className="h-10 w-72" />
      <Skeleton className="h-5 w-96 max-w-full" />
      <div className="grid w-full grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
