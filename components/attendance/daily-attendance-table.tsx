"use client";

import Link from "next/link";
import type { ChildRecord } from "@/lib/data";
import type { ChildDay } from "@/lib/domain/attendance";
import { ChildAvatar } from "@/components/shared/child-avatar";
import { useOrganization } from "@/components/shared/organization-provider";
import { StatusBadge } from "@/components/shared/status-badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDuration, formatTime, fullName } from "@/lib/utils";

export interface DailyRow {
  child: ChildRecord;
  day: ChildDay;
}

export function guardianNameFor(child: ChildRecord, guardianId?: string): string | undefined {
  const g = child.guardians.find((x) => x.guardian.id === guardianId);
  return g ? `${fullName(g.guardian)}` : undefined;
}

/** Child · Check In · Check Out · Duration · Drop-off · Pickup · Status */
export function DailyAttendanceTable({ rows, showDurations = true }: { rows: DailyRow[]; showDurations?: boolean }) {
  const org = useOrganization();
  return (
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Child</TableHead>
          <TableHead>Check In</TableHead>
          <TableHead>Check Out</TableHead>
          <TableHead>Duration</TableHead>
          <TableHead>Drop-off</TableHead>
          <TableHead>Pickup</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map(({ child, day }) => (
          <TableRow key={child.id}>
            <TableCell>
              <Link href={`/children/${child.id}`} className="flex items-center gap-3 font-bold text-ink hover:text-primary">
                <ChildAvatar name={fullName(child)} size="xs" />
                {fullName(child)}
              </Link>
            </TableCell>
            <TableCell className="tabular">{day.checkIn ? formatTime(day.checkIn.eventTime, org.timezone) : "—"}</TableCell>
            <TableCell className="tabular">{day.checkOut ? formatTime(day.checkOut.eventTime, org.timezone) : "—"}</TableCell>
            <TableCell className="tabular">
              {showDurations && day.durationMs !== undefined ? formatDuration(day.durationMs) : "—"}
              {day.status === "IN" && showDurations && <span className="ml-1 text-xs text-ink-subtle">so far</span>}
            </TableCell>
            <TableCell className="text-ink-muted">{guardianNameFor(child, day.checkIn?.guardianId) ?? "—"}</TableCell>
            <TableCell className="text-ink-muted">{guardianNameFor(child, day.checkOut?.guardianId) ?? "—"}</TableCell>
            <TableCell>
              <StatusBadge status={day.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
