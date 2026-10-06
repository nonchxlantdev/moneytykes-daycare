"use client";

import Link from "next/link";
import { Smile } from "lucide-react";
import type { ChildRecord } from "@/lib/data";
import { EmptyState } from "@/components/shared/empty-state";
import { useOrganization } from "@/components/shared/organization-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useChildDays } from "@/lib/hooks/use-attendance";
import { formatTime, fullName } from "@/lib/utils";
import { ChildCard } from "./child-card";

export function CurrentlyAtDaycare({ roster, limit = 8 }: { roster: ChildRecord[]; limit?: number }) {
  const org = useOrganization();
  const { days } = useChildDays(roster);
  const present = days
    .filter((d) => d.status === "IN" && d.checkIn)
    .sort((a, b) => b.checkIn!.eventTime.localeCompare(a.checkIn!.eventTime));
  const byId = new Map(roster.map((c) => [c.id, c]));

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>Currently at Daycare</CardTitle>
        <Link href="/attendance" className="text-sm font-semibold text-primary hover:underline">
          View All ({present.length})
        </Link>
      </CardHeader>
      <CardContent className="@container flex-1">
        {present.length === 0 ? (
          <EmptyState icon={Smile} title="No children checked in yet" description="Arrivals from the kiosk will appear here." />
        ) : (
          <ul className="grid grid-cols-1 gap-2.5 @[34rem]:grid-cols-2">
            {present.slice(0, limit).map((d) => {
              const child = byId.get(d.childId)!;
              const primary = child.guardians.find((g) => g.link.isPrimary)?.guardian;
              return (
                <li key={d.childId}>
                  <ChildCard
                    id={child.id}
                    name={fullName(child)}
                    time={formatTime(d.checkIn!.eventTime, org.timezone)}
                    status="IN"
                    guardianPhone={primary?.phone}
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
