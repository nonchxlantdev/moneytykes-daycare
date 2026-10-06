"use client";

import { PartyPopper } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTodayAlerts, type AlertInputs } from "@/lib/hooks/use-today-alerts";
import { AlertCard } from "./alert-card";

export function TodaysAlerts({ inputs }: { inputs: AlertInputs }) {
  const alerts = useTodayAlerts(inputs);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Today&apos;s Alerts
          {alerts.length > 0 && (
            <span className="flex size-6 items-center justify-center rounded-full bg-danger text-xs font-bold text-danger-foreground">
              {alerts.length}
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <EmptyState icon={PartyPopper} title="All clear" description="Nothing needs your attention right now." className="py-8" />
        ) : (
          <ul className="flex flex-col gap-2.5">
            {alerts.map((a) => (
              <li key={a.id}>
                <AlertCard tone={a.tone} title={a.title} detail={a.detail} href={a.href} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
