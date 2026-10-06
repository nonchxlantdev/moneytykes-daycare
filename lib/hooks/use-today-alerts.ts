"use client";

import { useMemo } from "react";
import { useOrganization } from "@/components/shared/organization-provider";
import { formatTime } from "@/lib/utils/format";
import { useChildDays } from "./use-attendance";

export interface AlertInputs {
  children: Array<{ id: string; firstName: string; lastName: string }>;
  staffOnLeave: Array<{ name: string; reason: string }>;
  /** null when the viewer isn't allowed to see billing. */
  outstandingFamilies: number | null;
}

export interface TodayAlert {
  id: string;
  tone: "danger" | "warning" | "info";
  title: string;
  detail: string;
  href: string;
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Operational alerts derived from live attendance + billing state. */
export function useTodayAlerts(inputs: AlertInputs): TodayAlert[] {
  const org = useOrganization();
  const { summary, days } = useChildDays(inputs.children);

  return useMemo(() => {
    const alerts: TodayAlert[] = [];
    if (summary.notArrived > 0) {
      const missing = days
        .filter((d) => d.status === "NOT_ARRIVED")
        .map((d) => inputs.children.find((c) => c.id === d.childId)?.firstName)
        .filter(Boolean)
        .slice(0, 3)
        .join(", ");
      const cutoff = formatTime(`2000-01-01T${org.expectedArrivalBy}:00Z`, "UTC");
      alerts.push({
        id: "not-checked-in",
        tone: "danger",
        title: `${plural(summary.notArrived, "child", "children")} not checked in`,
        detail: `Usually here by ${cutoff}${missing ? ` · ${missing}` : ""}`,
        href: "/attendance",
      });
    }
    if (inputs.outstandingFamilies) {
      alerts.push({
        id: "payments-due",
        tone: "warning",
        title: "Payment due this week",
        detail: `${plural(inputs.outstandingFamilies, "family has an", "families have")} outstanding balance${inputs.outstandingFamilies === 1 ? "" : "s"}`,
        href: "/payments",
      });
    }
    if (inputs.staffOnLeave.length > 0) {
      alerts.push({
        id: "staff-off",
        tone: "info",
        title: `${plural(inputs.staffOnLeave.length, "staff member", "staff members")} off today`,
        detail: inputs.staffOnLeave.map((s) => `${s.name} (${s.reason})`).join(", "),
        href: "/staff",
      });
    }
    return alerts;
  }, [summary.notArrived, days, inputs, org.expectedArrivalBy]);
}
