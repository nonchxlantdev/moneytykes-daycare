"use client";

import { ClipboardList } from "lucide-react";
import type { AttendanceEvent, ChildRecord } from "@/types/domain";
import { EmptyState } from "@/components/shared/empty-state";
import { useOrganization } from "@/components/shared/organization-provider";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { childHistory } from "@/lib/domain/attendance";
import { useNow } from "@/lib/hooks/use-now";
import { formatCalendarDate, formatDuration, formatTime, fullName } from "@/lib/utils";

/** Full history comes from the server (latest 200 events for this child). */
export function ChildAttendanceTab({ child, history: events }: { child: ChildRecord; history: AttendanceEvent[] }) {
  const org = useOrganization();
  const now = useNow();
  const history = childHistory(events, child.id, org.timezone, now ?? undefined);
  if (history.length === 0) {
    return (
      <Card>
        <EmptyState icon={ClipboardList} title="No attendance yet" description="Check-ins and check-outs from the kiosk will appear here." />
      </Card>
    );
  }
  const guardianName = new Map(child.guardians.map((g) => [g.guardian.id, fullName(g.guardian)]));

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Date</TableHead>
            <TableHead>Check In</TableHead>
            <TableHead>Drop-off</TableHead>
            <TableHead>Check Out</TableHead>
            <TableHead>Pickup</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {history.map((d) => (
            <TableRow key={d.date}>
              <TableCell className="font-semibold">{formatCalendarDate(d.date)}</TableCell>
              <TableCell className="tabular">{d.checkIn ? formatTime(d.checkIn.eventTime, org.timezone) : "—"}</TableCell>
              <TableCell className="text-ink-muted">{(d.checkIn?.guardianId && guardianName.get(d.checkIn.guardianId)) ?? "—"}</TableCell>
              <TableCell className="tabular">{d.checkOut ? formatTime(d.checkOut.eventTime, org.timezone) : "—"}</TableCell>
              <TableCell className="text-ink-muted">{(d.checkOut?.guardianId && guardianName.get(d.checkOut.guardianId)) ?? "—"}</TableCell>
              <TableCell className="tabular">{d.durationMs !== undefined && (d.checkOut || now) ? formatDuration(d.durationMs) : "—"}</TableCell>
              <TableCell>
                <StatusBadge status={d.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
