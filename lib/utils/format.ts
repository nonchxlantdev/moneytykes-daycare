/**
 * Formatting helpers. Every time/date helper takes the organization's
 * IANA timezone so a tenant in Panama and a tenant in Belize each see
 * their own wall-clock times regardless of the viewer's device.
 */

export function formatTime(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(iso));
}

export function formatDate(
  iso: string,
  timeZone: string,
  style: "short" | "medium" | "long" | "weekday" = "medium",
): string {
  const options: Record<typeof style, Intl.DateTimeFormatOptions> = {
    short: { month: "short", day: "numeric" },
    medium: { month: "short", day: "numeric", year: "numeric" },
    long: { weekday: "long", month: "short", day: "numeric", year: "numeric" },
    weekday: { weekday: "short" },
  };
  return new Intl.DateTimeFormat("en-US", { ...options[style], timeZone }).format(new Date(iso));
}

/** Format a plain calendar date (YYYY-MM-DD) without timezone drift. */
export function formatCalendarDate(date: string, style: "medium" | "short" = "medium"): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(style === "medium" ? { year: "numeric" } : {}),
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** YYYY-MM-DD for an instant, in the given timezone. */
export function dateKey(iso: string | Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(
    typeof iso === "string" ? new Date(iso) : iso,
  );
}

/** Hour of day (0–23) for an instant, in the given timezone. */
export function hourOf(iso: string, timeZone: string): number {
  return Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(new Date(iso)));
}

export function formatDuration(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60_000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function formatHours(ms: number): string {
  return `${(Math.max(0, ms) / 3_600_000).toFixed(1)} h`;
}

export function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency, currencyDisplay: "narrowSymbol" }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function greetingFor(date: Date, timeZone: string): string {
  const hour = Number(new Intl.DateTimeFormat("en-US", { hour: "numeric", hourCycle: "h23", timeZone }).format(date));
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

/** Distinct calendar dates (YYYY-MM-DD) for a list of instants, most recent first. */
export function distinctDates(instants: string[], timeZone: string): string[] {
  return Array.from(new Set(instants.map((i) => dateKey(i, timeZone)))).sort().reverse();
}
