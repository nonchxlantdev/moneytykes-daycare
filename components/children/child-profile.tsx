"use client";

import Link from "next/link";
import { Cake, ClipboardList, FileText, HeartPulse, LayoutGrid, LogIn, LogOut, StickyNote, UsersRound, Wallet } from "lucide-react";
import type { ChildDocument, Classroom, Invoice, Payment } from "@/types/domain";
import type { ChildRecord } from "@/lib/data";
import { ChildAvatar } from "@/components/shared/child-avatar";
import { useOrganization } from "@/components/shared/organization-provider";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useChildDays } from "@/lib/hooks/use-attendance";
import { ageLabel, formatCalendarDate, formatDuration, formatTime, fullName } from "@/lib/utils";
import { ChildAttendanceTab } from "./child-attendance-tab";
import { ChildDocumentsTab, ChildGuardiansTab, ChildNotesTab } from "./child-misc-tabs";
import { ChildOverviewTab } from "./child-overview-tab";
import { ChildPaymentsTab } from "./child-payments-tab";

export function ChildProfile({
  child,
  classroom,
  invoices,
  payments,
  documents,
}: {
  child: ChildRecord;
  classroom: Classroom;
  invoices: Invoice[];
  payments: Payment[];
  documents: ChildDocument[];
}) {
  const org = useOrganization();
  const { byChild, hasClock } = useChildDays([child]);
  const today = byChild.get(child.id);
  const name = fullName(child);

  const facts = [
    { label: "Date of birth", value: formatCalendarDate(child.dateOfBirth) },
    { label: "Age", value: ageLabel(child.dateOfBirth) },
    { label: "Class", value: classroom.name },
    { label: "Enrolled since", value: formatCalendarDate(child.enrolledOn) },
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
              <Badge tone={child.enrollmentStatus === "ACTIVE" ? "success" : "neutral"}>
                {child.enrollmentStatus === "ACTIVE" ? "Enrolled" : child.enrollmentStatus}
              </Badge>
              {child.allergies.length > 0 && (
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
          <TabsTrigger value="payments"><Wallet aria-hidden="true" /> Payments</TabsTrigger>
          <TabsTrigger value="documents"><FileText aria-hidden="true" /> Documents</TabsTrigger>
          <TabsTrigger value="notes"><StickyNote aria-hidden="true" /> Notes</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <ChildOverviewTab child={child} />
        </TabsContent>
        <TabsContent value="guardians">
          <ChildGuardiansTab child={child} />
        </TabsContent>
        <TabsContent value="attendance">
          <ChildAttendanceTab child={child} />
        </TabsContent>
        <TabsContent value="payments">
          <ChildPaymentsTab invoices={invoices} payments={payments} />
        </TabsContent>
        <TabsContent value="documents">
          <ChildDocumentsTab documents={documents} />
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
