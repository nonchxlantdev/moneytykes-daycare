import { Info } from "lucide-react";

/** Thin notice when the app is running on fixture data (no live D1). */
export function DemoModeBanner() {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-center text-sm font-medium text-ink"
    >
      <Info className="size-4 shrink-0 text-warning" aria-hidden="true" />
      Demo data — not connected to a live database. Check-ins may reset after redeploy.
    </div>
  );
}
