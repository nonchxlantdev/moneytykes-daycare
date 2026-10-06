import type { Staff, StaffDutyStatus, StaffTimeEvent } from "@/types/domain";
import { dateKey } from "@/lib/utils/format";

export interface StaffDay {
  staffId: string;
  status: StaffDutyStatus;
  clockIn?: StaffTimeEvent;
  clockOut?: StaffTimeEvent;
  workedMs: number;
}

/** Sum of closed + open (until `now`) CLOCK_IN→CLOCK_OUT intervals. */
export function workedMs(events: StaffTimeEvent[], now: Date = new Date()): number {
  const sorted = [...events].sort((a, b) => a.eventTime.localeCompare(b.eventTime));
  let total = 0;
  let openSince: number | undefined;
  for (const e of sorted) {
    const t = new Date(e.eventTime).getTime();
    if (e.type === "CLOCK_IN") openSince ??= t;
    else if (openSince !== undefined) {
      total += t - openSince;
      openSince = undefined;
    }
  }
  if (openSince !== undefined) total += Math.max(0, now.getTime() - openSince);
  return total;
}

export function deriveStaffDay(
  staff: Staff,
  events: StaffTimeEvent[],
  date: string,
  timeZone: string,
  now: Date = new Date(),
): StaffDay {
  const mine = events
    .filter((e) => e.staffId === staff.id && dateKey(e.eventTime, timeZone) === date)
    .sort((a, b) => a.eventTime.localeCompare(b.eventTime));
  const last = mine[mine.length - 1];
  let status: StaffDutyStatus = "OFF_DUTY";
  if (last?.type === "CLOCK_IN") status = "ON_DUTY";
  else if (staff.employmentStatus === "ON_LEAVE") status = "ON_LEAVE";
  return {
    staffId: staff.id,
    status,
    clockIn: mine.find((e) => e.type === "CLOCK_IN"),
    clockOut: last?.type === "CLOCK_OUT" ? last : undefined,
    workedMs: workedMs(mine, now),
  };
}

/** Hours per date for one staff member. */
export function timesheet(
  staffId: string,
  events: StaffTimeEvent[],
  dates: string[],
  timeZone: string,
  now: Date = new Date(),
): Array<{ date: string; clockIn?: string; clockOut?: string; workedMs: number }> {
  return dates.map((date) => {
    const day = events
      .filter((e) => e.staffId === staffId && dateKey(e.eventTime, timeZone) === date)
      .sort((a, b) => a.eventTime.localeCompare(b.eventTime));
    return {
      date,
      clockIn: day.find((e) => e.type === "CLOCK_IN")?.eventTime,
      clockOut: [...day].reverse().find((e) => e.type === "CLOCK_OUT")?.eventTime,
      workedMs: workedMs(day, now),
    };
  });
}
