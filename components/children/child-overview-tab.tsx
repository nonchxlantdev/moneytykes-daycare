"use client";

import type { ReactNode } from "react";
import { ClipboardList, HeartPulse, Phone, ShieldAlert, ShieldCheck, UserRound } from "lucide-react";
import type { AttendanceEvent, ChildRecord, GuardianLink } from "@/types/domain";
import { PersonAvatar } from "@/components/shared/child-avatar";
import { useOrganization } from "@/components/shared/organization-provider";
import { StatusBadge } from "@/components/shared/status-badge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { childHistory } from "@/lib/domain/attendance";
import { useCan } from "@/components/shared/viewer-provider";
import { formatCalendarDate, formatTime, fullName } from "@/lib/utils";

function InfoCard({ title, icon, children, className }: { title: string; icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="justify-start">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary [&_svg]:size-4">{icon}</span>
        <CardTitle className="text-base sm:text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function GuardianRow({ gl, showPhone = true }: { gl: GuardianLink; showPhone?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <PersonAvatar name={fullName(gl.guardian)} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-ink">{fullName(gl.guardian)}</p>
        <p className="text-xs text-ink-muted">{gl.link.relationship}</p>
      </div>
      {showPhone && (
        <a
          href={`tel:${gl.guardian.phone.replace(/\s/g, "")}`}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
        >
          <Phone className="size-3.5" aria-hidden="true" />
          {gl.guardian.phone}
        </a>
      )}
    </div>
  );
}

export function ChildOverviewTab({ child, history }: { child: ChildRecord; history: AttendanceEvent[] }) {
  const org = useOrganization();
  const canMedical = useCan("children:read-medical");
  const allergies = child.allergies ?? [];
  const primary = child.guardians.find((g) => g.link.isPrimary);
  const pickups = child.guardians.filter((g) => g.link.canPickUp);
  const emergency = child.guardians.filter((g) => g.link.isEmergencyContact);
  const recent = childHistory(history, child.id, org.timezone).slice(0, 5);

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
      <InfoCard title="Parent / Guardian" icon={<UserRound />}>
        {primary ? <GuardianRow gl={primary} /> : <p className="text-sm text-ink-muted">No primary guardian on file.</p>}
        {primary?.guardian.email && <p className="mt-3 truncate text-xs text-ink-muted">{primary.guardian.email}</p>}
      </InfoCard>

      <InfoCard title="Authorized Pickups" icon={<ShieldCheck />}>
        {pickups.length === 0 && <p className="text-sm text-ink-muted">No authorized pickups on file.</p>}
        <ul className="flex flex-col gap-3">
          {pickups.map((gl) => (
            <li key={gl.link.id}>
              <GuardianRow gl={gl} showPhone={false} />
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-ink-muted">Only these people may sign this child out at the kiosk.</p>
      </InfoCard>

      <InfoCard title="Emergency Contact" icon={<ShieldAlert />}>
        {emergency.length === 0 && <p className="text-sm text-ink-muted">No emergency contact on file.</p>}
        <ul className="flex flex-col gap-3">
          {emergency.map((gl) => (
            <li key={gl.link.id}>
              <GuardianRow gl={gl} />
            </li>
          ))}
        </ul>
      </InfoCard>

      <InfoCard title="Medical Notes" icon={<HeartPulse />} className="md:col-span-1">
        <div className="flex flex-wrap gap-1.5">
          {allergies.length > 0 ? (
            allergies.map((a) => (
              <Badge key={a} tone="danger">
                {a} allergy
              </Badge>
            ))
          ) : (
            <Badge tone="success">No known allergies</Badge>
          )}
        </div>
        {canMedical ? (
          <p className="mt-3 text-sm whitespace-pre-wrap text-ink">{child.medicalNotes ?? "No additional medical notes."}</p>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">Medical notes are restricted to owners and admins.</p>
        )}
        <p className="mt-3 text-xs text-ink-subtle">Visible to staff with health-record permission only.</p>
      </InfoCard>

      <InfoCard title="Recent Attendance" icon={<ClipboardList />} className="md:col-span-2 xl:col-span-2">
        {recent.length === 0 && <p className="text-sm text-ink-muted">No attendance recorded yet.</p>}
        <ul className="divide-y divide-line">
          {recent.map((d) => (
            <li key={d.date} className="flex items-center gap-3 py-2.5 text-sm">
              <span className="w-28 font-semibold text-ink">{formatCalendarDate(d.date, "short")}</span>
              <span className="flex-1 text-ink-muted tabular">
                {d.checkIn ? formatTime(d.checkIn.eventTime, org.timezone) : "—"} →{" "}
                {d.checkOut ? formatTime(d.checkOut.eventTime, org.timezone) : "still here"}
              </span>
              <StatusBadge status={d.status} />
            </li>
          ))}
        </ul>
      </InfoCard>
    </div>
  );
}
