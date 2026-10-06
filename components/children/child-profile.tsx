"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Cake, ClipboardList, FileText, HeartPulse, LayoutGrid, LogIn, LogOut, StickyNote, UsersRound, Wallet } from "lucide-react";
import type { AttendanceEvent, ChildRecord, Classroom, EnrollmentStatus, Invoice, Payment } from "@/types/domain";
import { ChildAvatar } from "@/components/shared/child-avatar";
import { useOrganization } from "@/components/shared/organization-provider";
import { FormAlert } from "@/components/shared/form-alert";
import { StatusBadge } from "@/components/shared/status-badge";
import { useCan } from "@/components/shared/viewer-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { callAction } from "@/lib/client/server-form";
import { setChildStatusAction } from "@/lib/server/actions";
import { useChildDays } from "@/lib/hooks/use-attendance";
import { ageLabel, formatCalendarDate, formatDuration, formatTime, fullName } from "@/lib/utils";
import { ChildAttendanceTab } from "./child-attendance-tab";
import { ChildDocumentsTab, ChildGuardiansTab, ChildNotesTab } from "./child-misc-tabs";
import { ChildOverviewTab } from "./child-overview-tab";
import { ChildPaymentsTab } from "./child-payments-tab";
import { EditChildDialog } from "./edit-child-dialog";

const ENROLLMENT_LABEL: Record<EnrollmentStatus, string> = {
  ACTIVE: "Enrolled",
  WAITLIST: "Waitlist",
  INACTIVE: "Inactive",
  WITHDRAWN: "Withdrawn",
};

function EnrollmentStatusControl({ child }: { child: ChildRecord }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const change = async (value: string) => {
    setBusy(true);
    setError(undefined);
    const result = await callAction(() => setChildStatusAction({ childId: child.id, enrollmentStatus: value }));
    setBusy(false);
    if (!result.ok) return setError(result.error.message);
    router.refresh();
  };
  return (
    <div className="flex flex-col gap-1">
      <Select value={child.enrollmentStatus} onValueChange={change} disabled={busy}>
        <SelectTrigger className="h-8 w-36 text-xs" aria-label="Enrollment status">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {(Object.keys(ENROLLMENT_LABEL) as EnrollmentStatus[]).map((s) => (
            <SelectItem key={s} value={s}>
              {ENROLLMENT_LABEL[s]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FormAlert message={error} className="text-xs" />
    </div>
  );
}

export function ChildProfile({
  child,
  classrooms,
  history,
  billing,
}: {
  child: ChildRecord;
  classrooms: Classroom[];
  history: AttendanceEvent[];
  /** null when the viewer may not see billing (mock data in Phase 2). */
  billing: { invoices: Invoice[]; payments: Payment[] } | null;
}) {
  const org = useOrganization();
  const canWrite = useCan("children:write");
  const classroom = classrooms.find((c) => c.id === child.classroomId);
  const { byChild, hasClock } = useChildDays([child]);
  const today = byChild.get(child.id);
  const name = fullName(child);

  const facts = [
    { label: "Date of birth", value: formatCalendarDate(child.dateOfBirth) },
    { label: "Age", value: ageLabel(child.dateOfBirth) },
    { label: "Class", value: classroom?.name ?? "Not assigned" },
    { label: "Enrolled since", value: child.enrolledOn ? formatCalendarDate(child.enrolledOn) : "—" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Card className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-primary/15 via-brand-secondary/10 to-brand-accent/15" aria-hidden="true" />
        <div className="relative flex flex-col gap-5 p-5 pt-10 md:flex-row md:items-end md:p-6 md:pt-12">
          <ChildAvatar name={name} photoUrl={child.photoUrl} size="2xl" ring />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{name}</h1>
              {canWrite ? (
                <EnrollmentStatusControl child={child} />
              ) : (
                <Badge tone={child.enrollmentStatus === "ACTIVE" ? "success" : "neutral"}>{ENROLLMENT_LABEL[child.enrollmentStatus]}</Badge>
              )}
              {child.hasAllergyAlert && (
                <Badge tone="danger">
                  <HeartPulse aria-hidden="true" /> Allergy alert
                </Badge>
              )}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
              {facts.map((f) => (
                <div key={f.label}>
                  <dt className="text-xs font-semibold text-ink-subtle">{f.label}</dt>
                  <dd className="text-sm font-bold text-ink">{f.value}</dd>
                </div>
              ))}
            </dl>
            {canWrite && (
              <div className="mt-4">
                <EditChildDialog child={child} classrooms={classrooms} />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface p-4 md:min-w-64">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold tracking-wide text-ink-subtle uppercase">Today</span>
              <StatusBadge status={today?.status ?? "NOT_ARRIVED"} />
            </div>
            <p className="text-sm text-ink-muted">
              {today?.status === "IN" && today.checkIn && (
                <>
                  Checked in at <strong className="text-ink">{formatTime(today.checkIn.eventTime, org.timezone)}</strong>
                  {hasClock && today.durationMs !== undefined && <> · {formatDuration(today.durationMs)} here</>}
                </>
              )}
              {today?.status === "OUT" && today.checkOut && (
                <>
                  Picked up at <strong className="text-ink">{formatTime(today.checkOut.eventTime, org.timezone)}</strong>
                </>
              )}
              {(!today || today.status === "NOT_ARRIVED") && "Not checked in yet today."}
            </p>
            {today?.status === "IN" ? (
              <Button asChild variant="soft" size="sm">
                <Link href={`/kiosk/check-out?child=${child.id}`}>
                  <LogOut /> Check out
                </Link>
              </Button>
            ) : (
              <Button asChild variant="success" size="sm">
                <Link href={`/kiosk/check-in?child=${child.id}`}>
                  <LogIn /> Check in
                </Link>
              </Button>
            )}
          </div>
        </div>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList aria-label="Child profile sections">
          <TabsTrigger value="overview"><LayoutGrid aria-hidden="true" /> Overview</TabsTrigger>
          <TabsTrigger value="guardians"><UsersRound aria-hidden="true" /> Guardians</TabsTrigger>
          <TabsTrigger value="attendance"><ClipboardList aria-hidden="true" /> Attendance</TabsTrigger>
          {billing && <TabsTrigger value="payments"><Wallet aria-hidden="true" /> Payments</TabsTrigger>}
          <TabsTrigger value="documents"><FileText aria-hidden="true" /> Documents</TabsTrigger>
          <TabsTrigger value="notes"><StickyNote aria-hidden="true" /> Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <ChildOverviewTab child={child} history={history} />
        </TabsContent>
        <TabsContent value="guardians">
          <ChildGuardiansTab child={child} />
        </TabsContent>
        <TabsContent value="attendance">
          <ChildAttendanceTab child={child} history={history} />
        </TabsContent>
        {billing && (
          <TabsContent value="payments">
            <ChildPaymentsTab childId={child.id} invoices={billing.invoices} payments={billing.payments} />
          </TabsContent>
        )}
        <TabsContent value="documents">
          <ChildDocumentsTab />
        </TabsContent>
        <TabsContent value="notes">
          <ChildNotesTab child={child} />
        </TabsContent>
      </Tabs>
      <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
        <Cake className="size-3.5" aria-hidden="true" /> Birthday {formatCalendarDate(child.dateOfBirth, "short")}
      </p>
    </div>
  );
}
