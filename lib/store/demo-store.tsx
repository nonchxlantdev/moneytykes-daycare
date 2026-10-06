"use client";

/**
 * IN-MEMORY DEMO STORE (mock service).
 *
 * Holds the event streams on the client so kiosk actions are reflected
 * immediately on the dashboard during a demo. Nothing is persisted —
 * a page reload restores the seed data. Signatures are never written
 * here or to localStorage; only a mock object key is recorded.
 *
 * Phase 2: replace `record*` with server actions that validate input
 * (Zod), authorize the device/user, insert into D1 and return the
 * stored event. Consumers keep the same hook API.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { AttendanceEvent, Payment, StaffTimeEvent } from "@/types/domain";

interface DemoStoreValue {
  attendanceEvents: AttendanceEvent[];
  staffTimeEvents: StaffTimeEvent[];
  sessionPayments: Payment[];
  /** `id` may be supplied by the client (UUID) so retries stay idempotent. */
  recordAttendanceEvent: (event: Omit<AttendanceEvent, "id"> & { id?: string }) => AttendanceEvent;
  recordStaffTimeEvent: (event: Omit<StaffTimeEvent, "id">) => StaffTimeEvent;
  recordPayment: (payment: Omit<Payment, "id">) => Payment;
}

const DemoStoreContext = createContext<DemoStoreValue | null>(null);

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

export function DemoStoreProvider({
  initialAttendanceEvents,
  initialStaffTimeEvents,
  children,
}: {
  initialAttendanceEvents: AttendanceEvent[];
  initialStaffTimeEvents: StaffTimeEvent[];
  children: ReactNode;
}) {
  const [attendanceEvents, setAttendanceEvents] = useState(initialAttendanceEvents);
  const [staffTimeEvents, setStaffTimeEvents] = useState(initialStaffTimeEvents);
  const [sessionPayments, setSessionPayments] = useState<Payment[]>([]);

  const recordAttendanceEvent = useCallback((input: Omit<AttendanceEvent, "id"> & { id?: string }) => {
    const event: AttendanceEvent = { ...input, id: input.id ?? newId("att") };
    setAttendanceEvents((prev) => (prev.some((e) => e.id === event.id) ? prev : [...prev, event]));
    return event;
  }, []);

  const recordStaffTimeEvent = useCallback((input: Omit<StaffTimeEvent, "id">) => {
    const event = { ...input, id: newId("ste") };
    setStaffTimeEvents((prev) => [...prev, event]);
    return event;
  }, []);

  const recordPayment = useCallback((input: Omit<Payment, "id">) => {
    const payment = { ...input, id: newId("pay") };
    setSessionPayments((prev) => [payment, ...prev]);
    return payment;
  }, []);

  const value = useMemo(
    () => ({
      attendanceEvents,
      staffTimeEvents,
      sessionPayments,
      recordAttendanceEvent,
      recordStaffTimeEvent,
      recordPayment,
    }),
    [attendanceEvents, staffTimeEvents, sessionPayments, recordAttendanceEvent, recordStaffTimeEvent, recordPayment],
  );

  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>;
}

export function useDemoStore(): DemoStoreValue {
  const ctx = useContext(DemoStoreContext);
  if (!ctx) throw new Error("useDemoStore must be used inside <DemoStoreProvider>");
  return ctx;
}
