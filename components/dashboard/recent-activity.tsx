"use client";

import { useMemo } from "react";
import Link from "next/link";
import { History } from "lucide-react";
import type { Staff } from "@/types/domain";
import type { ActivityNote, ChildRecord } from "@/lib/data";
import { EmptyState } from "@/components/shared/empty-state";
import { useOrganization } from "@/components/shared/organization-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTodayKey } from "@/lib/hooks/use-attendance";
import { useDemoStore } from "@/lib/store/demo-store";
import { dateKey, formatTime, fullName } from "@/lib/utils";
import { ActivityTimeline, type ActivityItem } from "./activity-timeline";

export function RecentActivity({
  roster,
  staff,
  notes,
  limit = 7,
}: {
  roster: ChildRecord[];
  staff: Staff[];
  notes: ActivityNote[];
  limit?: number;
}) {
  const org = useOrganization();
  const today = useTodayKey();
  const { attendanceEvents, staffTimeEvents } = useDemoStore();

  const items = useMemo<ActivityItem[]>(() => {
    const childName = new Map(roster.map((c) => [c.id, fullName(c)]));
    const staffName = new Map(staff.map((s) => [s.id, fullName(s)]));
    const isToday = (iso: string) => dateKey(iso, org.timezone) === today;
    const rows: Array<ActivityItem & { at: string }> = [
      ...attendanceEvents.filter((e) => isToday(e.eventTime)).map((e) => ({
        id: e.id,
        at: e.eventTime,
        time: formatTime(e.eventTime, org.timezone),
        kind: e.type,
        actor: childName.get(e.childId) ?? "Unknown child",
        action: e.type === "CHECK_IN" ? "checked in" : "checked out",
      })),
      ...staffTimeEvents.filter((e) => isToday(e.eventTime)).map((e) => ({
        id: e.id,
        at: e.eventTime,
        time: formatTime(e.eventTime, org.timezone),
        kind: e.type,
        actor: `${staffName.get(e.staffId) ?? "Staff"} (Staff)`,
        action: e.type === "CLOCK_IN" ? "clocked in" : "clocked out",
      })),
      ...notes.filter((n) => isToday(n.at)).map((n) => ({
        id: n.id,
        at: n.at,
        time: formatTime(n.at, org.timezone),
        kind: "NOTE" as const,
        actor: "System",
        action: n.message,
      })),
    ];
    return rows.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
  }, [attendanceEvents, staffTimeEvents, notes, roster, staff, org.timezone, today, limit]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <Link href="/attendance" className="text-sm font-semibold text-primary hover:underline">
          View All
        </Link>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <EmptyState icon={History} title="No activity yet today" />
        ) : (
          <ActivityTimeline items={items} />
        )}
      </CardContent>
    </Card>
  );
}
