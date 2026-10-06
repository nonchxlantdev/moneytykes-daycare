"use client";

/**
 * Server data for the current tenant, made available to client widgets.
 *
 * Attendance and staff-time events come from D1 via the tenant layout and
 * are re-delivered whenever a server action revalidates (or the auto
 * refresh ticks), so this provider holds NO authoritative state of its
 * own. Mutations always go through server actions; the UI never shows a
 * success state before the server has persisted the event.
 *
 * `sessionPayments` is the one exception: payments are still mock data in
 * Phase 2 and recorded payments live only in this browser session.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AttendanceEvent, Payment, StaffTimeEvent } from "@/types/domain";

interface LiveDataValue {
  attendanceEvents: AttendanceEvent[];
  staffTimeEvents: StaffTimeEvent[];
  /** Earliest instant covered by the event window (older history is loaded per child). */
  windowStart: string;
  sessionPayments: Payment[];
  recordPayment: (payment: Omit<Payment, "id">) => Payment;
}

const LiveDataContext = createContext<LiveDataValue | null>(null);

export function LiveDataProvider({
  attendanceEvents,
  staffTimeEvents,
  windowStart,
  children,
}: {
  attendanceEvents: AttendanceEvent[];
  staffTimeEvents: StaffTimeEvent[];
  windowStart: string;
  children: ReactNode;
}) {
  const [sessionPayments, setSessionPayments] = useState<Payment[]>([]);
  const recordPayment = useCallback((input: Omit<Payment, "id">) => {
    const payment = { ...input, id: `pay_${crypto.randomUUID()}` };
    setSessionPayments((prev) => [payment, ...prev]);
    return payment;
  }, []);

  const value = useMemo(
    () => ({ attendanceEvents, staffTimeEvents, windowStart, sessionPayments, recordPayment }),
    [attendanceEvents, staffTimeEvents, windowStart, sessionPayments, recordPayment],
  );
  return <LiveDataContext.Provider value={value}>{children}</LiveDataContext.Provider>;
}

export function useLiveData(): LiveDataValue {
  const ctx = useContext(LiveDataContext);
  if (!ctx) throw new Error("useLiveData must be used inside <LiveDataProvider>");
  return ctx;
}
