"use client";

import Link from "next/link";
import { UsersRound } from "lucide-react";
import type { Staff } from "@/types/domain";
import { EmptyState } from "@/components/shared/empty-state";
import { useOrganization } from "@/components/shared/organization-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStaffDays } from "@/lib/hooks/use-attendance";
import { formatTime, fullName } from "@/lib/utils";
import { StaffStatusCard } from "./staff-status-card";

export function StaffWorking({ staff, limit = 4 }: { staff: Staff[]; limit?: number }) {
  const org = useOrganization();
  const { days, onDuty } = useStaffDays(staff);
  const working = days
    .filter((d) => d.status === "ON_DUTY")
    .sort((a, b) => (a.clockIn?.eventTime ?? "").localeCompare(b.clockIn?.eventTime ?? ""));
  const byId = new Map(staff.map((s) => [s.id, s]));
  const featured = working.slice(0, limit);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Staff Currently Working</CardTitle>
        <Link href="/staff" className="text-sm font-semibold text-primary hover:underline">
          View All ({onDuty})
        </Link>
      </CardHeader>
      <CardContent>
        {featured.length === 0 ? (
          <EmptyState icon={UsersRound} title="No one is clocked in" className="py-8" />
        ) : (
          <ul className="flex flex-col">
            {featured.map((d) => {
              const s = byId.get(d.staffId)!;
              return (
                <li key={d.staffId}>
                  <StaffStatusCard
                    id={s.id}
                    name={fullName(s)}
                    role={s.role}
                    time={d.clockIn ? formatTime(d.clockIn.eventTime, org.timezone) : undefined}
                    status={d.status}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
