"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, EllipsisVertical, LogIn, LogOut, Phone, SearchX, UserRound } from "lucide-react";
import type { ChildAttendanceStatus, ChildRecord, Classroom, EnrollmentStatus } from "@/types/domain";
import { ChildAvatar } from "@/components/shared/child-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { useOrganization } from "@/components/shared/organization-provider";
import { PageHeader } from "@/components/shared/page-header";
import { SearchInput } from "@/components/shared/search-input";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCan } from "@/components/shared/viewer-provider";
import { useChildDays } from "@/lib/hooks/use-attendance";
import { ageLabel, formatTime, fullName } from "@/lib/utils";
import { AddChildDialog } from "./add-child-dialog";

type StatusFilter = "all" | ChildAttendanceStatus;

const ENROLLMENT_BADGE: Record<EnrollmentStatus, { label: string; tone: "success" | "neutral" | "warning" | "secondary" }> = {
  ACTIVE: { label: "Enrolled", tone: "success" },
  WAITLIST: { label: "Waitlist", tone: "secondary" },
  INACTIVE: { label: "Inactive", tone: "neutral" },
  WITHDRAWN: { label: "Withdrawn", tone: "neutral" },
};

export function ChildrenDirectory({
  roster,
  classrooms,
  initialQuery,
}: {
  roster: ChildRecord[];
  classrooms: Classroom[];
  initialQuery: string;
}) {
  const org = useOrganization();
  const router = useRouter();
  const canWrite = useCan("children:write");
  const [query, setQuery] = useState(initialQuery);
  const [classFilter, setClassFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  // Headline counts cover currently enrolled children; the table lists every status.
  const enrolled = useMemo(() => roster.filter((c) => c.enrollmentStatus === "ACTIVE"), [roster]);
  const { summary } = useChildDays(enrolled);
  const { byChild } = useChildDays(roster);
  const classroomName = useMemo(() => new Map(classrooms.map((c) => [c.id, c.name])), [classrooms]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return roster
      .filter((c) => {
        if (classFilter !== "all" && c.classroomId !== classFilter) return false;
        if (statusFilter !== "all" && byChild.get(c.id)?.status !== statusFilter) return false;
        if (!q) return true;
        const haystack = [fullName(c), ...c.guardians.map((g) => fullName(g.guardian)), ...c.guardians.map((g) => g.guardian.phone)]
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => a.firstName.localeCompare(b.firstName));
  }, [roster, query, classFilter, statusFilter, byChild]);

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 animate-in fade-in-0 duration-500">
      <PageHeader
        title="Children"
        description={`${summary.enrolled} enrolled · ${summary.present} at daycare now · ${summary.checkedOut} checked out · ${summary.notArrived} not in yet`}
        actions={canWrite ? <AddChildDialog classrooms={classrooms} /> : undefined}
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-line p-4 md:flex-row md:items-center">
          <SearchInput
            value={query}
            onValueChange={setQuery}
            placeholder="Search by child, guardian or phone…"
            label="Search children"
            className="md:max-w-sm"
          />
          <div className="flex flex-1 flex-wrap gap-3 md:justify-end">
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Filter by class">
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
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="w-full sm:w-48" aria-label="Filter by attendance status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All attendance</SelectItem>
                <SelectItem value="IN">At daycare (IN)</SelectItem>
                <SelectItem value="OUT">Checked out</SelectItem>
                <SelectItem value="NOT_ARRIVED">Not checked in</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={SearchX} title="No children match" description="Try a different name or clear the filters." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-16">Photo</TableHead>
                <TableHead>Child</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Guardian</TableHead>
                <TableHead>Guardian Phone</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Attendance</TableHead>
                <TableHead className="w-12">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((child) => {
                const day = byChild.get(child.id);
                const primary = child.guardians.find((g) => g.link.isPrimary) ?? child.guardians[0];
                const href = `/children/${child.id}`;
                const enrollment = ENROLLMENT_BADGE[child.enrollmentStatus];
                return (
                  <TableRow key={child.id} className="cursor-pointer" onClick={() => router.push(href)}>
                    <TableCell>
                      <ChildAvatar name={fullName(child)} photoUrl={child.photoUrl} size="sm" />
                    </TableCell>
                    <TableCell>
                      <Link href={href} className="font-bold text-ink hover:text-primary" onClick={(e) => e.stopPropagation()}>
                        {fullName(child)}
                      </Link>
                      {child.hasAllergyAlert && (
                        <Badge tone="danger" className="ml-2">
                          Allergy
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-ink-muted">{ageLabel(child.dateOfBirth)}</TableCell>
                    <TableCell>
                      {child.classroomId ? <Badge tone="secondary">{classroomName.get(child.classroomId) ?? "—"}</Badge> : <span className="text-ink-subtle">—</span>}
                    </TableCell>
                    <TableCell>
                      {primary ? (
                        <>
                          <span className="font-medium">{fullName(primary.guardian)}</span>
                          <span className="ml-1 text-xs text-ink-subtle">({primary.link.relationship})</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-ink-muted tabular">{primary?.guardian.phone ?? "—"}</TableCell>
                    <TableCell>
                      <Badge tone={enrollment.tone}>{enrollment.label}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={day?.status ?? "NOT_ARRIVED"} />
                        <span className="text-xs text-ink-muted tabular">
                          {day?.status === "IN" && day.checkIn && formatTime(day.checkIn.eventTime, org.timezone)}
                          {day?.status === "OUT" && day.checkOut && formatTime(day.checkOut.eventTime, org.timezone)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="rounded-lg p-1.5 text-ink-subtle hover:bg-muted hover:text-ink"
                            aria-label={`Actions for ${fullName(child)}`}
                          >
                            <EllipsisVertical className="size-5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={href}>
                              <UserRound /> View profile
                            </Link>
                          </DropdownMenuItem>
                          {day?.status === "IN" ? (
                            <DropdownMenuItem asChild>
                              <Link href={`/kiosk/check-out?child=${child.id}`}>
                                <LogOut /> Check out
                              </Link>
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem asChild>
                              <Link href={`/kiosk/check-in?child=${child.id}`}>
                                <LogIn /> Check in
                              </Link>
                            </DropdownMenuItem>
                          )}
                          {primary && (
                            <DropdownMenuItem asChild>
                              <a href={`tel:${primary.guardian.phone.replace(/\s/g, "")}`}>
                                <Phone /> Call {primary.guardian.firstName}
                              </a>
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <div className="flex items-center justify-between border-t border-line px-5 py-3 text-sm text-ink-muted">
          <span>
            Showing <strong className="text-ink">{rows.length}</strong> of {roster.length} children
          </span>
          <Link href="/attendance" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
            Today&apos;s attendance <ChevronRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </Card>
    </div>
  );
}
