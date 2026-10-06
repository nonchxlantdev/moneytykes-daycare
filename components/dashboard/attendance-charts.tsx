"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";
import { useOrganization } from "@/components/shared/organization-provider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { attendanceDates, countsByDate, hourlyTrend } from "@/lib/domain/attendance";
import { useTodayKey } from "@/lib/hooks/use-attendance";
import { useDemoStore } from "@/lib/store/demo-store";

const SERIES = {
  checkIns: { label: "Check-ins", color: "var(--brand-primary)" },
  checkOuts: { label: "Check-outs", color: "var(--brand-accent)" },
} as const;

const axisTick = { fill: "var(--ink-muted)", fontSize: 12, fontWeight: 500 };

function Legend() {
  return (
    <div className="flex items-center gap-4 text-xs font-semibold text-ink-muted" aria-hidden="true">
      {Object.values(SERIES).map((s) => (
        <span key={s.label} className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label }: TooltipContentProps<ValueType, NameType>) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-xs shadow-lift">
      <p className="mb-1 font-bold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={String(p.dataKey)} className="flex items-center gap-2 text-ink-muted">
          <span className="size-2 rounded-full" style={{ backgroundColor: p.color }} />
          {SERIES[p.dataKey as keyof typeof SERIES]?.label}
          <span className="ml-auto pl-3 font-bold text-ink tabular">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

/** Children checked in / out per school day (last 5 days with data). */
export function AttendanceOverviewChart() {
  const org = useOrganization();
  const { attendanceEvents } = useDemoStore();
  const data = useMemo(() => {
    const dates = attendanceDates(attendanceEvents, org.timezone).slice(0, 5).reverse();
    return countsByDate(attendanceEvents, dates, org.timezone).map((d) => {
      const [y, m, day] = d.date.split("-").map(Number);
      const label = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "UTC" }).format(new Date(Date.UTC(y, m - 1, day)));
      return { ...d, label };
    });
  }, [attendanceEvents, org.timezone]);

  return (
    <Card className="h-full">
      <CardHeader className="flex-wrap">
        <CardTitle>Attendance Overview</CardTitle>
        <span className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink-muted">Last 5 days</span>
      </CardHeader>
      <CardContent>
        <Legend />
        <div className="mt-3 h-56" role="img" aria-label={`Attendance by day: ${data.map((d) => `${d.label} ${d.checkIns} in, ${d.checkOuts} out`).join("; ")}`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 18, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} width={40} />
              <Tooltip content={ChartTooltip} cursor={{ fill: "var(--muted)", radius: 8 }} />
              <Bar dataKey="checkIns" fill={SERIES.checkIns.color} radius={[4, 4, 0, 0]} maxBarSize={22}>
                <LabelList dataKey="checkIns" position="top" style={{ fill: "var(--ink)", fontSize: 11, fontWeight: 700 }} />
              </Bar>
              <Bar dataKey="checkOuts" fill={SERIES.checkOuts.color} radius={[4, 4, 0, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

/** Check-ins and check-outs per hour, today. */
export function CheckInOutTrendChart() {
  const org = useOrganization();
  const today = useTodayKey();
  const { attendanceEvents } = useDemoStore();
  const data = useMemo(
    () =>
      hourlyTrend(attendanceEvents, today, org.timezone).map((r) => ({
        ...r,
        label: r.hour === 12 ? "12PM" : r.hour > 12 ? `${r.hour - 12}PM` : `${r.hour}AM`,
      })),
    [attendanceEvents, today, org.timezone],
  );

  return (
    <Card className="h-full">
      <CardHeader className="flex-wrap">
        <CardTitle>Check In/Out Trend</CardTitle>
        <span className="rounded-lg border border-line px-2.5 py-1 text-xs font-semibold text-ink-muted">Today</span>
      </CardHeader>
      <CardContent>
        <Legend />
        <div className="mt-3 h-56" role="img" aria-label="Check-ins and check-outs per hour today">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--line)" strokeDasharray="3 4" />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisTick} interval={2} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axisTick} width={40} />
              <Tooltip content={ChartTooltip} cursor={{ stroke: "var(--line-strong)", strokeWidth: 1 }} />
              {(["checkIns", "checkOuts"] as const).map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={SERIES[key].color}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 2, stroke: "var(--surface)" }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
