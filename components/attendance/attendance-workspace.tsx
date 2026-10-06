"use client";

import { useMemo, useState } from "react";
import { CircleCheck, Clock, DoorOpen, History, Lock, LogIn, LogOut, Pencil, Smile } from "lucide-react";
import type { Classroom } from "@/types/domain";
import type { ChildRecord } from "@/types/domain";
import { useOrganization } from "@/components/shared/organization-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { attendanceDates, deriveDailyAttendance, eventsOnDate, summarize } from "@/lib/domain/attendance";
import { useTodayKey } from "@/lib/hooks/use-attendance";
import { useNow } from "@/lib/hooks/use-now";
import { useLiveData } from "@/lib/store/live-data";
import { cn, formatCalendarDate, formatTime, fullName } from "@/lib/utils";
import { DailyAttendanceTable, guardianNameFor } from "./daily-attendance-table";

export function AttendanceWorkspace({ roster, classrooms }: { roster: ChildRecord[]; classrooms: Classroom[] }) {
  const org = useOrganization();
  const now = useNow();
  const today = useTodayKey();
  const { attendanceEvents } = useLiveData();
  const dates = useMemo(() => {
    const all = attendanceDates(attendanceEvents, org.timezone);
    return all.includes(today) ? all : [today, ...all];
  }, [attendanceEvents, org.timezone, today]);
  const [date, setDate] = useState<string>(today);
  const [classFilter, setClassFilter] = useState("all");
  const isToday = date === today;

  const days = useMemo(
    () => deriveDailyAttendance(roster, attendanceEvents, date, org.timezone, now ?? undefined),
    [roster, attendanceEvents, date, org.timezone, now],
  );
  const summary = summarize(days);
  const byId = useMemo(() => new Map(roster.map((c) => [c.id, c])), [roster]);
  const rows = days
    .map((day) => ({ child: byId.get(day.childId)!, day }))
    .filter((r) => classFilter === "all" || r.child.classroomId === classFilter)
    .sort((a, b) => {
      const order = { IN: 0, OUT: 1, NOT_ARRIVED: 2 } as const;
      return order[a.day.status] - order[b.day.status] || a.child.firstName.localeCompare(b.child.firstName);
    });
  const log = useMemo(
    () => eventsOnDate(attendanceEvents, date, org.timezone).sort((a, b) => b.eventTime.localeCompare(a.eventTime)),
    [attendanceEvents, date, org.timezone],
  );

  const stats = [
    { label: isToday ? "Here now" : "Attended", value: isToday ? summary.present : summary.present + summary.checkedOut, icon: Smile, tone: "text-success bg-success/12" },
    { label: "Checked out", value: summary.checkedOut, icon: DoorOpen, tone: "text-brand-accent bg-brand-accent/15" },
    { label: isToday ? "Not in yet" : "Absent", value: summary.notArrived, icon: Clock, tone: "text-warning bg-warning/15" },
    { label: "Attendance rate", value: `${Math.round(((summary.present + summary.checkedOut) / Math.max(1, summary.enrolled)) * 100)}%`, icon: CircleCheck, tone: "text-primary bg-primary/10" },
  ];

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 animate-in fade-in-0 duration-500">
      <PageHeader
        title="Attendance"
        description="Every check-in and check-out is an immutable, signed event. Daily status is derived from those events."
        actions={
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Pencil /> Record correction
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Attendance corrections</DialogTitle>
                <DialogDescription>
                  Corrections never overwrite history. In the next phase a manager adds a correcting event with a required reason, and the change is written to the audit log.
                </DialogDescription>
              </DialogHeader>
              <Badge tone="warning" className="self-start">Arrives with the database phase</Badge>
            </DialogContent>
          </Dialog>
        }
      />

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Choose a day">
        {dates.slice(0, 8).map((d) => (
          <button
            key={d}
            type="button"
            aria-pressed={d === date}
            onClick={() => setDate(d)}
            className={cn(
              "h-10 rounded-xl px-4 text-sm font-semibold transition-colors",
              d === date ? "bg-primary text-primary-foreground shadow-soft" : "border border-line bg-surface text-ink-muted hover:text-ink",
            )}
          >
            {d === today ? "Today" : formatCalendarDate(d, "short")}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="flex items-center gap-4 p-4">
            <span className={cn("flex size-11 items-center justify-center rounded-xl", tone)}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <p className="text-2xl font-extrabold text-ink tabular">{value}</p>
              <p className="text-sm text-ink-muted">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="register">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="register">Daily register</TabsTrigger>
            <TabsTrigger value="events">
              <History aria-hidden="true" /> Event log ({log.length})
            </TabsTrigger>
          </TabsList>
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-44" aria-label="Filter by class">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All classes</SelectItem>
              {classrooms.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TabsContent value="register">
          <Card className="overflow-hidden">
            <DailyAttendanceTable rows={rows} showDurations={!isToday || now !== null} />
          </Card>
        </TabsContent>
        <TabsContent value="events">
          <Card className="overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Time</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Child</TableHead>
                  <TableHead>Guardian</TableHead>
                  <TableHead>Device</TableHead>
                  <TableHead>Signature</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {log
                  .filter((e) => classFilter === "all" || byId.get(e.childId)?.classroomId === classFilter)
                  .map((e) => {
                    const child = byId.get(e.childId);
                    return (
                      <TableRow key={e.id}>
                        <TableCell className="font-semibold tabular">{formatTime(e.eventTime, org.timezone)}</TableCell>
                        <TableCell>
                          <Badge tone={e.type === "CHECK_IN" ? "success" : "accent"}>
                            {e.type === "CHECK_IN" ? <LogIn aria-hidden="true" /> : <LogOut aria-hidden="true" />}
                            {e.type.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">{child ? fullName(child) : e.childId}</TableCell>
                        <TableCell className="text-ink-muted">{(child && guardianNameFor(child, e.guardianId)) ?? "—"}</TableCell>
                        <TableCell className="text-ink-muted">{e.deviceId === "dev_front_desk_ipad" ? "Front Desk iPad" : (e.deviceId ?? "Admin")}</TableCell>
                        <TableCell>
                          {e.signatureObjectKey ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-ink-muted" title={e.signatureObjectKey}>
                              <Lock className="size-3.5" aria-hidden="true" /> Private object
                            </span>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
