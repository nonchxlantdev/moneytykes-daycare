"use client";

import { Lock } from "lucide-react";
import type { ChildRecord } from "@/lib/data";
import { useOrganization } from "@/components/shared/organization-provider";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { childHistory } from "@/lib/domain/attendance";
import { useNow } from "@/lib/hooks/use-now";
import { useDemoStore } from "@/lib/store/demo-store";
import { formatCalendarDate, formatDuration, formatTime, fullName } from "@/lib/utils";

export function ChildAttendanceTab({ child }: { child: ChildRecord }) {
  const org = useOrganization();
  const now = useNow();
  const { attendanceEvents } = useDemoStore();
  const history = childHistory(attendanceEvents, child.id, org.timezone, now ?? undefined);
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
            <TableHead>Signatures</TableHead>
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
                {[d.checkIn, d.checkOut].some((e) => e?.signatureObjectKey) ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted">
                    <Lock className="size-3.5" aria-hidden="true" /> On file (private)
                  </span>
                ) : (
                  "—"
                )}
              </TableCell>
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
