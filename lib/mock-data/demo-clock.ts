/**
 * DEMO CLOCK — mock-data only.
 *
 * Seed data is generated relative to "today" in the sample tenant's
 * timezone so the prototype always looks live. Belize does not observe
 * DST, so a fixed offset is safe here. Real data will carry its own
 * absolute timestamps from the database.
 */
import type { ISODate, ISODateTime } from "@/types/domain";

export const DEMO_TIMEZONE = "America/Belize";
const DEMO_UTC_OFFSET = "-06:00";
const DAY_MS = 86_400_000;

const dateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: DEMO_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Calendar date (YYYY-MM-DD) in the demo timezone, `daysAgo` days back. */
export function demoDate(daysAgo = 0): ISODate {
  return dateFormatter.format(new Date(Date.now() - daysAgo * DAY_MS));
}

/** Timestamp for a wall-clock time ("08:15") on a demo date. */
export function demoTime(hhmm: string, daysAgo = 0): ISODateTime {
  return `${demoDate(daysAgo)}T${hhmm}:00${DEMO_UTC_OFFSET}`;
}

/** The last `count` weekdays before today (most recent first), as daysAgo offsets. */
export function previousWeekdayOffsets(count: number): number[] {
  const offsets: number[] = [];
  let daysAgo = 1;
  while (offsets.length < count) {
    const day = new Date(`${demoDate(daysAgo)}T12:00:00${DEMO_UTC_OFFSET}`).getUTCDay();
    if (day !== 0 && day !== 6) offsets.push(daysAgo);
    daysAgo += 1;
  }
  return offsets;
}

/** Deterministic PRNG so server and client render identical seed data. */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function minutesToHHMM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
