import { dateKey } from "@/lib/utils/format";
import { zonedStartOfDay } from "@/lib/utils/timezone";
import type { TenantContext } from "./tenant-context";

/**
 * Start of "today" in the organization's timezone.
 *
 * Attendance and time-clock state machines only look at events since this
 * instant, matching what every screen shows. A check-in (or clock-in) left
 * open from a previous day therefore never blocks today's first check-in;
 * it simply appears as a day without a check-out in history and reports.
 */
export function operationalDayStart(ctx: Pick<TenantContext, "timezone">, now: Date): Date {
  return zonedStartOfDay(dateKey(now, ctx.timezone), ctx.timezone);
}
