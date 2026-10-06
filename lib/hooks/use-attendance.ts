"use client";

import { useMemo } from "react";
import type { Child, Staff } from "@/types/domain";
import { useOrganization } from "@/components/shared/organization-provider";
import { deriveDailyAttendance, summarize, type ChildDay } from "@/lib/domain/attendance";
import { deriveStaffDay, type StaffDay } from "@/lib/domain/staff-time";
import { useLiveData } from "@/lib/store/live-data";
import { dateKey } from "@/lib/utils/format";
import { useNow } from "./use-now";

/** Today's date key (YYYY-MM-DD) in the organization's timezone. */
export function useTodayKey(): string {
  const { timezone } = useOrganization();
  const now = useNow();
  return dateKey(now ?? new Date(), timezone);
}

/** Today's derived attendance for the given children, keyed by child id. */
export function useChildDays(children: Pick<Child, "id">[], date?: string) {
  const { timezone } = useOrganization();
  const { attendanceEvents } = useLiveData();
  const now = useNow();
  const today = useTodayKey();
  const target = date ?? today;

  return useMemo(() => {
    const days = deriveDailyAttendance(children as Child[], attendanceEvents, target, timezone, now ?? undefined);
    const byChild = new Map<string, ChildDay>(days.map((d) => [d.childId, d]));
    return { days, byChild, summary: summarize(days), hasClock: now !== null };
  }, [children, attendanceEvents, target, timezone, now]);
}

export function useStaffDays(staff: Staff[], date?: string) {
  const { timezone } = useOrganization();
  const { staffTimeEvents } = useLiveData();
  const now = useNow();
  const today = useTodayKey();
  const target = date ?? today;

  return useMemo(() => {
    const days = staff.map((s) => deriveStaffDay(s, staffTimeEvents, target, timezone, now ?? undefined));
    const byStaff = new Map<string, StaffDay>(days.map((d) => [d.staffId, d]));
    return { days, byStaff, onDuty: days.filter((d) => d.status === "ON_DUTY").length };
  }, [staff, staffTimeEvents, target, timezone, now]);
}
