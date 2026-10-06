import type { AttendanceEvent, Child, ChildAttendanceStatus } from "@/types/domain";
import { dateKey, hourOf } from "@/lib/utils/format";

/**
 * Attendance derivation. Status, durations and counts are always
 * computed from immutable CHECK_IN / CHECK_OUT events — the same logic
 * will run server-side against D1 later.
 */

export interface ChildDay {
  childId: string;
  status: ChildAttendanceStatus;
  checkIn?: AttendanceEvent;
  checkOut?: AttendanceEvent;
  /** Time at daycare: check-out − check-in, or now − check-in while present. */
  durationMs?: number;
}

export function eventsOnDate(events: AttendanceEvent[], date: string, timeZone: string): AttendanceEvent[] {
  return events.filter((e) => dateKey(e.eventTime, timeZone) === date);
}

/** Derive one child's day. Supports multiple in/out pairs; reports first IN and last OUT. */
export function deriveChildDay(
  dayEvents: AttendanceEvent[],
  childId: string,
  now: Date = new Date(),
): ChildDay {
  const mine = dayEvents
    .filter((e) => e.childId === childId)
    .sort((a, b) => a.eventTime.localeCompare(b.eventTime));
  if (mine.length === 0) return { childId, status: "NOT_ARRIVED" };

  const last = mine[mine.length - 1];
  const checkIn = mine.find((e) => e.type === "CHECK_IN");
  const checkOut = last.type === "CHECK_OUT" ? last : undefined;
  const status: ChildAttendanceStatus = last.type === "CHECK_IN" ? "IN" : "OUT";

  let durationMs: number | undefined;
  if (checkIn) {
    const end = checkOut ? new Date(checkOut.eventTime) : now;
    durationMs = Math.max(0, end.getTime() - new Date(checkIn.eventTime).getTime());
  }
  return { childId, status, checkIn, checkOut, durationMs };
}

export function deriveDailyAttendance(
  children: Child[],
  events: AttendanceEvent[],
  date: string,
  timeZone: string,
  now: Date = new Date(),
): ChildDay[] {
  const dayEvents = eventsOnDate(events, date, timeZone);
  return children.map((c) => deriveChildDay(dayEvents, c.id, now));
}

export interface AttendanceSummary {
  enrolled: number;
  present: number;
  checkedOut: number;
  notArrived: number;
}

export function summarize(days: ChildDay[]): AttendanceSummary {
  return {
    enrolled: days.length,
    present: days.filter((d) => d.status === "IN").length,
    checkedOut: days.filter((d) => d.status === "OUT").length,
    notArrived: days.filter((d) => d.status === "NOT_ARRIVED").length,
  };
}

/** Per-day counts of check-ins and check-outs for a list of dates. */
export function countsByDate(
  events: AttendanceEvent[],
  dates: string[],
  timeZone: string,
): Array<{ date: string; checkIns: number; checkOuts: number }> {
  return dates.map((date) => {
    const day = eventsOnDate(events, date, timeZone);
    return {
      date,
      checkIns: day.filter((e) => e.type === "CHECK_IN").length,
      checkOuts: day.filter((e) => e.type === "CHECK_OUT").length,
    };
  });
}

/** Check-in / check-out counts per hour for a single date. */
export function hourlyTrend(
  events: AttendanceEvent[],
  date: string,
  timeZone: string,
  fromHour = 6,
  toHour = 18,
): Array<{ hour: number; checkIns: number; checkOuts: number }> {
  const day = eventsOnDate(events, date, timeZone);
  const rows = [];
  for (let hour = fromHour; hour <= toHour; hour++) {
    const inHour = day.filter((e) => hourOf(e.eventTime, timeZone) === hour);
    rows.push({
      hour,
      checkIns: inHour.filter((e) => e.type === "CHECK_IN").length,
      checkOuts: inHour.filter((e) => e.type === "CHECK_OUT").length,
    });
  }
  return rows;
}

/** Distinct dates (YYYY-MM-DD) that have any attendance, most recent first. */
export function attendanceDates(events: AttendanceEvent[], timeZone: string): string[] {
  return Array.from(new Set(events.map((e) => dateKey(e.eventTime, timeZone)))).sort().reverse();
}

/** One child's attendance history: a derived ChildDay per date, most recent first. */
export function childHistory(
  events: AttendanceEvent[],
  childId: string,
  timeZone: string,
  now: Date = new Date(),
): Array<ChildDay & { date: string }> {
  const mine = events.filter((e) => e.childId === childId);
  return attendanceDates(mine, timeZone).map((date) => ({
    date,
    ...deriveChildDay(eventsOnDate(mine, date, timeZone), childId, now),
  }));
}
