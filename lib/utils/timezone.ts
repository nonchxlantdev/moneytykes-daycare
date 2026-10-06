/**
 * Timezone math without dependencies. Instants are stored in UTC; an
 * organization's IANA timezone decides what "today" and "8:15 AM" mean.
 * Never assume the server's timezone equals the daycare's.
 */

const formatters = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Offset (ms) of `timeZone` from UTC at the given instant. */
export function timeZoneOffsetMs(instant: number, timeZone: string): number {
  const parts = partsFormatter(timeZone).formatToParts(new Date(instant));
  const get = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(instant / 1000) * 1000;
}

/** The UTC instant of a wall-clock time (`HH:mm`) on a calendar date in `timeZone`. DST-safe. */
export function zonedTimeToUtc(dateKey: string, time: string, timeZone: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const wall = Date.UTC(y, m - 1, d, hh, mm);
  let ts = wall - timeZoneOffsetMs(wall, timeZone);
  const corrected = wall - timeZoneOffsetMs(ts, timeZone);
  if (corrected !== ts) ts = corrected;
  return new Date(ts);
}

/** UTC instant at local midnight of `dateKey` in `timeZone`. */
export function zonedStartOfDay(dateKey: string, timeZone: string): Date {
  return zonedTimeToUtc(dateKey, "00:00", timeZone);
}

/** Calendar date (YYYY-MM-DD) `days` before `dateKey`. */
export function addDays(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
