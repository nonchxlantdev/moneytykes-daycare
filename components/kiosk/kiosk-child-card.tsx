import type { ChildAttendanceStatus } from "@/types/domain";
import { ChildAvatar } from "@/components/shared/child-avatar";
import { StatusBadge } from "@/components/shared/status-badge";
import { cn } from "@/lib/utils";

/** Large, tappable child tile for kiosk selection screens. */
export function KioskChildCard({
  name,
  photoUrl,
  status,
  caption,
  onSelect,
  muted = false,
}: {
  name: string;
  photoUrl?: string;
  status?: ChildAttendanceStatus;
  caption?: string;
  onSelect: () => void;
  muted?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "group relative flex w-full flex-col items-center gap-3 rounded-3xl border border-line bg-surface p-4 text-center shadow-soft transition-[transform,box-shadow] duration-150 hover:shadow-lift active:scale-[0.97] sm:p-5",
        muted && "opacity-60",
      )}
    >
      {status && <StatusBadge status={status} className="absolute top-3 right-3" />}
      <ChildAvatar name={name} photoUrl={photoUrl} size="xl" className="sm:size-24 sm:text-3xl" />
      <span>
        <span className="block text-lg leading-tight font-bold text-ink">{name}</span>
        {caption && <span className="mt-0.5 block text-sm text-ink-muted tabular">{caption}</span>}
      </span>
    </button>
  );
}
