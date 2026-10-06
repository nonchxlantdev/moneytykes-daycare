import Link from "next/link";
import type { StaffDutyStatus } from "@/types/domain";
import { PersonAvatar } from "@/components/shared/child-avatar";
import { StatusBadge } from "@/components/shared/status-badge";

export function StaffStatusCard({
  id,
  name,
  role,
  time,
  status,
}: {
  id: string;
  name: string;
  role: string;
  time?: string;
  status: StaffDutyStatus;
}) {
  return (
    <Link href={`/staff/${id}`} className="flex items-center gap-3 rounded-xl px-1 py-2 transition-colors hover:bg-muted/60">
      <PersonAvatar name={name} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{name}</p>
        <p className="truncate text-xs text-ink-muted">{role}</p>
      </div>
      {time && <span className="hidden text-sm text-ink-muted tabular sm:inline">{time}</span>}
      <StatusBadge status={status} />
    </Link>
  );
}
