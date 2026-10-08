import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Neutral shimmer block used by route-level loading states. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-xl bg-muted", className)} />;
}

function LoadingMarker({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-10">
      <LoaderCircle className="size-10 animate-spin text-primary" aria-hidden="true" />
      <p className="text-base font-semibold text-ink">{label}</p>
    </div>
  );
}

/** Generic page skeleton: visible Loading + spinner, with light shimmer beneath. */
export function PageSkeleton({ label = "Loading" }: { label?: string }) {
  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6" role="status" aria-live="polite">
      <LoadingMarker label={label} />
      <div className="flex flex-col gap-2 opacity-50" aria-hidden="true">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-1 gap-4 opacity-40 sm:grid-cols-2 xl:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28" />
        ))}
      </div>
    </div>
  );
}

export function KioskSkeleton() {
  return (
    <div className="flex flex-1 flex-col items-center gap-6 pt-6" role="status" aria-live="polite">
      <LoadingMarker label="Loading" />
      <div className="grid w-full grid-cols-2 gap-4 opacity-40 sm:grid-cols-3 lg:grid-cols-4" aria-hidden="true">
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} className="h-40 rounded-3xl" />
        ))}
      </div>
    </div>
  );
}
