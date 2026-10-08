"use client";

import { useMemo, useState } from "react";
import { CalendarRange, ClipboardCheck, Download, Eye, FileSpreadsheet, History, Printer, Timer, Wallet } from "lucide-react";
import type { Payment, Staff } from "@/types/domain";
import type { ChildRecord } from "@/types/domain";
import { DailyAttendanceTable } from "@/components/attendance/daily-attendance-table";
import { EmptyState } from "@/components/shared/empty-state";
import { useOrganization } from "@/components/shared/organization-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTodayKey } from "@/lib/hooks/use-attendance";
import { useNow } from "@/lib/hooks/use-now";
import { useLiveData } from "@/lib/store/live-data";
import { cn, formatCalendarDate } from "@/lib/utils";
import { downloadText, toCsv } from "@/lib/utils/csv";
import {
  dailyReport,
  historyReport,
  paymentsReport,
  presetRange,
  staffHoursReport,
  weeklyCheckInSheet,
  type DateRange,
  type RangePreset,
  type ReportId,
} from "./report-data";

const REPORTS: Array<{ id: ReportId; title: string; body: string; icon: typeof ClipboardCheck; tone: string }> = [
  { id: "daily", title: "Daily Attendance", body: "Who came, when, and who picked them up.", icon: ClipboardCheck, tone: "bg-success/12 text-success" },
  { id: "weekly", title: "Weekly Check-in Sheet", body: "Whole daycare in/out times for the week — for ministry audits.", icon: CalendarRange, tone: "bg-primary/10 text-primary" },
  { id: "history", title: "Attendance History", body: "Day-by-day attendance rates over a period.", icon: History, tone: "bg-primary/10 text-primary" },
  { id: "staff", title: "Staff Hours", body: "Hours worked from time-clock events.", icon: Timer, tone: "bg-brand-secondary/12 text-brand-secondary" },
  { id: "payments", title: "Payments", body: "Collections by receipt and method.", icon: Wallet, tone: "bg-brand-accent/15 text-brand-accent" },
];

const PRESETS: Array<{ id: RangePreset; label: string }> = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "custom", label: "Custom" },
];

export function ReportsCenter({
  roster,
  staff,
  payments: seeded,
  classrooms = [],
}: {
  roster: ChildRecord[];
  staff: Staff[];
  payments: Payment[];
  classrooms?: Array<{ id: string; name: string }>;
}) {
  const org = useOrganization();
  const now = useNow();
  const today = useTodayKey();
  const { attendanceEvents, staffTimeEvents, sessionPayments } = useLiveData();
  const [report, setReport] = useState<ReportId>("daily");
  const [preset, setPreset] = useState<RangePreset>("today");
  const [custom, setCustom] = useState<DateRange>({ from: today, to: today });
  const [applied, setApplied] = useState<DateRange>({ from: today, to: today });
  const classNames = useMemo(() => new Map(classrooms.map((c) => [c.id, c.name])), [classrooms]);

  const choosePreset = (p: RangePreset) => {
    setPreset(p);
    if (p !== "custom") setApplied(presetRange(p, today));
  };

  const selectReport = (id: ReportId) => {
    setReport(id);
    if (id === "weekly" && preset !== "week" && preset !== "custom") {
      setPreset("week");
      setApplied(presetRange("week", today));
    }
  };

  const clock = useMemo(() => now ?? new Date(), [now]);
  const data = useMemo(() => {
    switch (report) {
      case "daily":
        return dailyReport(roster, attendanceEvents, applied.to, org.timezone, clock);
      case "weekly":
        return weeklyCheckInSheet(roster, attendanceEvents, applied, org.timezone, clock, (id) =>
          id ? (classNames.get(id) ?? "—") : "—",
        );
      case "history":
        return historyReport(roster, attendanceEvents, applied, org.timezone, clock);
      case "staff":
        return staffHoursReport(staff, staffTimeEvents, applied, org.timezone, clock);
      case "payments":
        return paymentsReport(roster, [...sessionPayments, ...seeded], applied, org.timezone, org.currency);
    }
  }, [report, roster, staff, attendanceEvents, staffTimeEvents, sessionPayments, seeded, applied, org.timezone, org.currency, clock, classNames]);

  const meta = REPORTS.find((r) => r.id === report)!;
  const rangeLabel =
    report === "daily" || applied.from === applied.to
      ? formatCalendarDate(applied.to)
      : `${formatCalendarDate(applied.from, "short")} – ${formatCalendarDate(applied.to)}`;

  const exportCsv = () =>
    downloadText(`${org.slug}-${report}-${applied.from}${applied.to !== applied.from ? `_${applied.to}` : ""}.csv`, toCsv(data.headers, data.rows));

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 animate-in fade-in-0 duration-500">
      <PageHeader title="Reports" description="Operational reports derived from attendance, time-clock and payment records." />

      <div className="no-print grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5" role="tablist" aria-label="Report type">
        {REPORTS.map(({ id, title, body, icon: Icon, tone }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={report === id}
            onClick={() => selectReport(id)}
            className={cn(
              "flex items-start gap-4 rounded-2xl border bg-surface p-5 text-left shadow-soft transition-[box-shadow,border-color]",
              report === id ? "border-primary ring-4 ring-primary/10" : "border-line hover:shadow-lift",
            )}
          >
            <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tone)}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-bold text-ink">{title}</span>
              <span className="mt-0.5 block text-sm text-ink-muted">{body}</span>
            </span>
          </button>
        ))}
      </div>

      <Card className="no-print">
        <CardContent className="flex flex-col gap-4 pt-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  aria-pressed={preset === p.id}
                  onClick={() => choosePreset(p.id)}
                  className={cn(
                    "h-10 rounded-xl px-4 text-sm font-semibold transition-colors",
                    preset === p.id ? "bg-ink text-white" : "border border-line bg-surface text-ink-muted hover:text-ink",
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {preset === "custom" && (
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <Label htmlFor="from" className="text-xs">From</Label>
                  <Input id="from" type="date" value={custom.from} max={custom.to} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="w-44" />
                </div>
                <div className="flex flex-col gap-1">
                  <Label htmlFor="to" className="text-xs">To</Label>
                  <Input id="to" type="date" value={custom.to} min={custom.from} max={today} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="w-44" />
                </div>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setApplied(preset === "custom" ? custom : presetRange(preset, today))}>
              <Eye /> View
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={data.rows.length === 0}>
              <FileSpreadsheet /> Export CSV
            </Button>
            <Button onClick={() => window.print()} title="Opens the print dialog — choose “Save as PDF”. Server-generated PDFs arrive in Phase 2.">
              <Printer /> Download PDF
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="flex-wrap">
          <div>
            <CardTitle>{meta.title}</CardTitle>
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-ink-muted">
              <CalendarRange className="size-4" aria-hidden="true" /> {org.name} · {rangeLabel}
            </p>
          </div>
          {data.summary && (
            <dl className="flex flex-wrap gap-2">
              {data.summary.map((s) => (
                <div key={s.label} className="rounded-xl bg-muted px-3 py-2">
                  <dt className="text-[11px] font-semibold tracking-wide text-ink-subtle uppercase">{s.label}</dt>
                  <dd className="text-sm font-extrabold text-ink tabular">{s.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </CardHeader>
        {data.rows.length === 0 ? (
          <EmptyState icon={Download} title="No records in this range" description="Try a different date range." />
        ) : report === "daily" && data.days ? (
          <DailyAttendanceTable
            rows={data.days.map((day) => ({ child: roster.find((c) => c.id === day.childId)!, day }))}
            showDurations={now !== null}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                {data.headers.map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((r, i) => (
                <TableRow key={i}>
                  {r.map((cell, j) => (
                    <TableCell key={j} className={cn(j === 0 && "font-semibold", "tabular")}>
                      {report === "history" && j === 0 ? formatCalendarDate(cell) : cell}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
