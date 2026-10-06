"use client";

import { DoorOpen, ShieldCheck, UsersRound, Smile } from "lucide-react";
import type { Staff } from "@/types/domain";
import { useChildDays, useStaffDays } from "@/lib/hooks/use-attendance";
import { MetricCard } from "./metric-card";

export function DashboardMetrics({ roster, staff }: { roster: { id: string }[]; staff: Staff[] }) {
  const { summary } = useChildDays(roster);
  const { onDuty } = useStaffDays(staff);
  const attended = summary.present + summary.checkedOut;
  const pct = (n: number) => (attended === 0 ? 0 : (n / attended) * 100);

  return (
    <section aria-label="Today at a glance" className="@container">
      <div className="grid grid-cols-1 gap-4 @md:grid-cols-2 @[60rem]:grid-cols-4">
      <MetricCard
        label="Children Enrolled"
        value={summary.enrolled}
        caption="Total enrolled children"
        icon={Smile}
        tone="brand"
        href="/children"
      />
      <MetricCard
        label="Checked In"
        value={summary.present}
        caption="Currently at daycare"
        icon={ShieldCheck}
        tone="success"
        percent={pct(summary.present)}
      />
      <MetricCard
        label="Checked Out"
        value={summary.checkedOut}
        caption="Left for the day"
        icon={DoorOpen}
        tone="accent"
        percent={pct(summary.checkedOut)}
      />
      <MetricCard label="Staff On Duty" value={onDuty} caption="Currently working" icon={UsersRound} tone="secondary" href="/staff" />
      </div>
    </section>
  );
}
