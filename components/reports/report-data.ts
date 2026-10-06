import type { AttendanceEvent, Payment, Staff, StaffTimeEvent } from "@/types/domain";
import type { ChildRecord } from "@/types/domain";
import { deriveDailyAttendance, summarize, type ChildDay } from "@/lib/domain/attendance";
import { timesheet } from "@/lib/domain/staff-time";
import { dateKey, formatCurrency, formatDuration, formatTime, fullName } from "@/lib/utils";
import { methodLabel } from "@/components/payments/payment-labels";

export type ReportId = "daily" | "history" | "staff" | "payments";
export type RangePreset = "today" | "yesterday" | "week" | "month" | "custom";
export interface DateRange {
  from: string;
  to: string;
}

const DAY = 86_400_000;
const toUtc = (d: string) => {
  const [y, m, day] = d.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
};
const fromUtc = (t: number) => new Date(t).toISOString().slice(0, 10);

export function datesBetween({ from, to }: DateRange): string[] {
  const out: string[] = [];
  for (let t = toUtc(from); t <= toUtc(to); t += DAY) out.push(fromUtc(t));
  return out;
}

export function presetRange(preset: Exclude<RangePreset, "custom">, today: string): DateRange {
  const t = toUtc(today);
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "yesterday":
      return { from: fromUtc(t - DAY), to: fromUtc(t - DAY) };
    case "week": {
      const dow = (new Date(t).getUTCDay() + 6) % 7; // Monday = 0
      return { from: fromUtc(t - dow * DAY), to: today };
    }
    case "month":
      return { from: `${today.slice(0, 7)}-01`, to: today };
  }
}

export interface ReportTable {
  headers: string[];
  rows: string[][];
  summary?: Array<{ label: string; value: string }>;
  /** Present on the daily report so the UI can render the rich table. */
  days?: ChildDay[];
}

export function dailyReport(
  roster: ChildRecord[],
  events: AttendanceEvent[],
  date: string,
  tz: string,
  now: Date,
): ReportTable {
  const days = deriveDailyAttendance(roster, events, date, tz, now);
  const byId = new Map(roster.map((c) => [c.id, c]));
  const g = (child: ChildRecord, id?: string) => {
    const x = child.guardians.find((l) => l.guardian.id === id)?.guardian;
    return x ? fullName(x) : "—";
  };
  const s = summarize(days);
  return {
    days,
    headers: ["Child", "Check In", "Check Out", "Duration", "Drop-off", "Pickup", "Status"],
    rows: days.map((d) => {
      const c = byId.get(d.childId)!;
      return [
        fullName(c),
        d.checkIn ? formatTime(d.checkIn.eventTime, tz) : "—",
        d.checkOut ? formatTime(d.checkOut.eventTime, tz) : "—",
        d.durationMs !== undefined ? formatDuration(d.durationMs) : "—",
        g(c, d.checkIn?.guardianId),
        g(c, d.checkOut?.guardianId),
        d.status === "NOT_ARRIVED" ? "Absent" : d.status,
      ];
    }),
    summary: [
      { label: "Attended", value: String(s.present + s.checkedOut) },
      { label: "Still here", value: String(s.present) },
      { label: "Absent", value: String(s.notArrived) },
    ],
  };
}

export function historyReport(roster: ChildRecord[], events: AttendanceEvent[], range: DateRange, tz: string, now: Date): ReportTable {
  const rows: string[][] = [];
  let attendedTotal = 0;
  let openDays = 0;
  for (const date of datesBetween(range).reverse()) {
    const days = deriveDailyAttendance(roster, events, date, tz, now);
    const s = summarize(days);
    const attended = s.present + s.checkedOut;
    if (attended === 0) continue; // closed / weekend
    openDays++;
    attendedTotal += attended;
    const durations = days.filter((d) => d.checkOut && d.durationMs !== undefined).map((d) => d.durationMs!);
    const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : 0;
    rows.push([date, String(attended), String(s.notArrived), `${Math.round((attended / Math.max(1, s.enrolled)) * 100)}%`, avg ? formatDuration(avg) : "—"]);
  }
  return {
    headers: ["Date", "Attended", "Absent", "Attendance rate", "Avg. stay"],
    rows,
    summary: [
      { label: "Days open", value: String(openDays) },
      { label: "Avg. daily attendance", value: openDays ? (attendedTotal / openDays).toFixed(1) : "0" },
    ],
  };
}

export function staffHoursReport(staff: Staff[], events: StaffTimeEvent[], range: DateRange, tz: string, now: Date): ReportTable {
  const dates = datesBetween(range);
  let total = 0;
  const rows = staff.map((s) => {
    const sheet = timesheet(s.id, events, dates, tz, now).filter((d) => d.workedMs > 0);
    const worked = sheet.reduce((a, d) => a + d.workedMs, 0);
    total += worked;
    return [fullName(s), s.jobTitle, String(sheet.length), formatDuration(worked), sheet.length ? formatDuration(worked / sheet.length) : "—"];
  });
  return {
    headers: ["Staff member", "Role", "Days worked", "Total hours", "Avg. shift"],
    rows,
    summary: [{ label: "Total staff hours", value: formatDuration(total) }],
  };
}

export function paymentsReport(roster: ChildRecord[], payments: Payment[], range: DateRange, tz: string, currency: string): ReportTable {
  const byId = new Map(roster.map((c) => [c.id, c]));
  const inRange = payments
    .filter((p) => {
      const d = dateKey(p.receivedAt, tz);
      return d >= range.from && d <= range.to;
    })
    .sort((a, b) => b.receivedAt.localeCompare(a.receivedAt));
  const total = inRange.reduce((a, p) => a + p.amount, 0);
  const byMethod = new Map<string, number>();
  inRange.forEach((p) => byMethod.set(methodLabel[p.method], (byMethod.get(methodLabel[p.method]) ?? 0) + p.amount));
  return {
    headers: ["Receipt", "Date", "Child", "Method", "Amount"],
    rows: inRange.map((p) => {
      const c = byId.get(p.childId);
      return [p.receiptNumber, dateKey(p.receivedAt, tz), c ? fullName(c) : "—", methodLabel[p.method], formatCurrency(p.amount, currency)];
    }),
    summary: [
      { label: "Total collected", value: formatCurrency(total, currency) },
      ...[...byMethod.entries()].map(([label, v]) => ({ label, value: formatCurrency(v, currency) })),
    ],
  };
}
