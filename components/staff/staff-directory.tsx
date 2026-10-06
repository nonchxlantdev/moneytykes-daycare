"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Clock, Mail, Phone, Plus, SearchX } from "lucide-react";
import type { Classroom, Staff } from "@/types/domain";
import { PersonAvatar } from "@/components/shared/child-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { useOrganization } from "@/components/shared/organization-provider";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { timesheet } from "@/lib/domain/staff-time";
import { useStaffDays } from "@/lib/hooks/use-attendance";
import { useNow } from "@/lib/hooks/use-now";
import { useDemoStore } from "@/lib/store/demo-store";
import { distinctDates, formatDuration, formatTime, fullName } from "@/lib/utils";

export function StaffDirectory({ staff, classrooms }: { staff: Staff[]; classrooms: Classroom[] }) {
  const org = useOrganization();
  const now = useNow();
  const { staffTimeEvents } = useDemoStore();
  const { byStaff, onDuty } = useStaffDays(staff);
  const [query, setQuery] = useState("");
  const classroomName = new Map(classrooms.map((c) => [c.id, c.name]));

  // Hours across the 5 most recent working days, per staff member.
  const recentDates = useMemo(() => distinctDates(staffTimeEvents.map((e) => e.eventTime), org.timezone).slice(0, 5), [staffTimeEvents, org.timezone]);
  const weekHours = useMemo(
    () =>
      new Map(
        staff.map((s) => [s.id, timesheet(s.id, staffTimeEvents, recentDates, org.timezone, now ?? undefined).reduce((a, d) => a + d.workedMs, 0)]),
      ),
    [staff, staffTimeEvents, recentDates, org.timezone, now],
  );

  const visible = staff.filter((s) => `${fullName(s)} ${s.role}`.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 animate-in fade-in-0 duration-500">
      <PageHeader
        title="Staff"
        description={`${staff.length} team members · ${onDuty} on duty now`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/kiosk/staff">
                <Clock /> Time clock
              </Link>
            </Button>
            <Button disabled title="Staff invitations arrive with authentication (Phase 2)">
              <Plus /> Add Staff
            </Button>
          </>
        }
      />
      <SearchInput value={query} onValueChange={setQuery} placeholder="Search staff by name or role…" label="Search staff" className="max-w-md" />
      {visible.length === 0 ? (
        <Card>
          <EmptyState icon={SearchX} title="No staff match your search" />
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {visible.map((s) => {
            const day = byStaff.get(s.id);
            return (
              <li key={s.id}>
                <Card className="group h-full transition-shadow hover:shadow-lift">
                  <Link href={`/staff/${s.id}`} className="flex h-full flex-col p-5">
                    <div className="flex items-start gap-4">
                      <PersonAvatar name={fullName(s)} size="lg" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-ink group-hover:text-primary">{fullName(s)}</p>
                        <p className="text-sm text-ink-muted">{s.role}</p>
                        {s.classroomId && (
                          <Badge tone="secondary" className="mt-2">
                            {classroomName.get(s.classroomId)}
                          </Badge>
                        )}
                      </div>
                      {day && <StatusBadge status={day.status} />}
                    </div>
                    <dl className="mt-5 grid grid-cols-2 gap-3 rounded-xl bg-muted/60 p-3 text-sm">
                      <div>
                        <dt className="text-xs text-ink-subtle">Today</dt>
                        <dd className="font-semibold text-ink tabular">
                          {day?.clockIn ? formatTime(day.clockIn.eventTime, org.timezone) : s.leaveReason ?? "—"}
                          {day?.clockOut ? ` – ${formatTime(day.clockOut.eventTime, org.timezone)}` : ""}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs text-ink-subtle">Last 5 days</dt>
                        <dd className="font-semibold text-ink tabular">{now ? formatDuration(weekHours.get(s.id) ?? 0) : "—"}</dd>
                      </div>
                    </dl>
                    <div className="mt-4 flex flex-col gap-1 text-sm text-ink-muted">
                      <span className="flex items-center gap-2">
                        <Phone className="size-3.5" aria-hidden="true" /> {s.phone}
                      </span>
                      <span className="flex items-center gap-2 truncate">
                        <Mail className="size-3.5" aria-hidden="true" /> {s.email}
                      </span>
                    </div>
                  </Link>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
