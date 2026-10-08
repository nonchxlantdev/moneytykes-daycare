"use client";

import { useMemo } from "react";
import { CalendarDays, Clock, KeyRound, Mail, Pencil, Phone, Timer } from "lucide-react";
import type { Classroom, Staff } from "@/types/domain";
import { PersonAvatar } from "@/components/shared/child-avatar";
import { useOrganization } from "@/components/shared/organization-provider";
import { StatusBadge } from "@/components/shared/status-badge";
import { useCan } from "@/components/shared/viewer-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { timesheet } from "@/lib/domain/staff-time";
import { useStaffDays } from "@/lib/hooks/use-attendance";
import { useNow } from "@/lib/hooks/use-now";
import { useLiveData } from "@/lib/store/live-data";
import { DemoSoftRemove } from "@/components/shared/demo-soft-remove";
import { updateStaffAction } from "@/lib/server/actions";
import { EMPLOYMENT_LABEL, StaffFormDialog } from "./staff-form-dialog";
import { distinctDates, formatCalendarDate, formatDuration, formatTime, fullName } from "@/lib/utils";

export function StaffProfile({ member, classrooms }: { member: Staff; classrooms: Classroom[] }) {
  const org = useOrganization();
  const canManage = useCan("staff:manage");
  const classroomName = classrooms.find((c) => c.id === member.classroomId)?.name;
  const now = useNow();
  const { staffTimeEvents } = useLiveData();
  const { byStaff } = useStaffDays([member]);
  const today = byStaff.get(member.id);

  const sheet = useMemo(() => {
    const dates = distinctDates(staffTimeEvents.filter((e) => e.staffId === member.id).map((e) => e.eventTime), org.timezone).slice(0, 10);
    return timesheet(member.id, staffTimeEvents, dates, org.timezone, now ?? undefined);
  }, [member.id, staffTimeEvents, org.timezone, now]);
  const last5 = sheet.slice(0, 5).reduce((a, d) => a + d.workedMs, 0);
  const avg = sheet.length ? sheet.reduce((a, d) => a + d.workedMs, 0) / sheet.length : 0;

  const stats = [
    { label: "Today", value: now && today ? formatDuration(today.workedMs) : "—", icon: Clock },
    { label: "Last 5 working days", value: now ? formatDuration(last5) : "—", icon: CalendarDays },
    { label: "Average shift", value: now ? formatDuration(avg) : "—", icon: Timer },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card className="flex flex-col gap-5 p-6 md:flex-row md:items-center">
        <PersonAvatar name={fullName(member)} size="xl" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{fullName(member)}</h1>
            {today && <StatusBadge status={today.status} />}
          </div>
          <p className="mt-1 text-ink-muted">
            {member.jobTitle}
            {classroomName && <> · {classroomName}</>}
            {member.hiredOn && <> · since {formatCalendarDate(member.hiredOn)}</>}
          </p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-muted">
            {member.phone && (
              <span className="flex items-center gap-1.5">
                <Phone className="size-4" aria-hidden="true" /> {member.phone}
              </span>
            )}
            {member.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="size-4" aria-hidden="true" /> {member.email}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <KeyRound className="size-4" aria-hidden="true" /> {member.hasPin ? "Time-clock PIN set" : "No time-clock PIN"}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 md:items-end">
          {member.employmentStatus !== "ACTIVE" && (
            <Badge tone="warning">{member.statusNote ?? EMPLOYMENT_LABEL[member.employmentStatus]}</Badge>
          )}
          {canManage && (
            <div className="flex flex-wrap gap-2">
              <StaffFormDialog
                member={member}
                classrooms={classrooms}
                trigger={
                  <Button variant="outline" size="sm">
                    <Pencil /> Edit
                  </Button>
                }
              />
              {member.employmentStatus !== "TERMINATED" && (
                <DemoSoftRemove
                  label="Remove"
                  subjectName={fullName(member)}
                  confirmLabel="Remove staff member"
                  redirectTo="/staff"
                  onRemove={() =>
                    updateStaffAction({
                      staffId: member.id,
                      employmentStatus: "TERMINATED",
                      statusNote: "Removed in demo",
                    })
                  }
                />
              )}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, icon: Icon }) => (
          <Card key={label} className="flex items-center gap-4 p-5">
            <span className="flex size-11 items-center justify-center rounded-xl bg-brand-secondary/12 text-brand-secondary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-extrabold text-ink tabular">{value}</p>
              <p className="text-sm text-ink-muted">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle>Timesheet</CardTitle>
          <span className="text-xs text-ink-subtle">Derived from clock-in / clock-out events</span>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Date</TableHead>
                <TableHead>Clock In</TableHead>
                <TableHead>Clock Out</TableHead>
                <TableHead className="text-right">Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sheet.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-ink-muted">
                    No clock events yet.
                  </TableCell>
                </TableRow>
              )}
              {sheet.map((d) => (
                <TableRow key={d.date}>
                  <TableCell className="font-semibold">{formatCalendarDate(d.date)}</TableCell>
                  <TableCell className="tabular">{d.clockIn ? formatTime(d.clockIn, org.timezone) : "—"}</TableCell>
                  <TableCell className="tabular">{d.clockOut ? formatTime(d.clockOut, org.timezone) : <Badge tone="success">On shift</Badge>}</TableCell>
                  <TableCell className="text-right font-semibold tabular">{now || d.clockOut ? formatDuration(d.workedMs) : "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
