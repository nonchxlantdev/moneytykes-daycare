/**
 * Time-relative demo seed, regenerated once per calendar day so the
 * prototype always shows "today". Deterministic (seeded PRNG), so the
 * server render and any re-render agree.
 */
import type { AttendanceEvent, ChildDocument, Invoice, Payment, StaffTimeEvent } from "@/types/domain";
import { buildActivityNotes, buildChildDocuments, type ActivityNote } from "./activity";
import { buildAttendanceEvents } from "./attendance";
import { demoDate } from "./demo-clock";
import { buildBilling } from "./payments";
import { buildStaffTimeEvents } from "./staff";

export interface DemoSeed {
  attendanceEvents: AttendanceEvent[];
  staffTimeEvents: StaffTimeEvent[];
  invoices: Invoice[];
  payments: Payment[];
  nextReceiptSequence: number;
  activityNotes: ActivityNote[];
  childDocuments: ChildDocument[];
}

let cache: { date: string; seed: DemoSeed } | undefined;

export function getDemoSeed(): DemoSeed {
  const date = demoDate();
  if (cache?.date !== date) {
    const billing = buildBilling();
    cache = {
      date,
      seed: {
        attendanceEvents: buildAttendanceEvents(),
        staffTimeEvents: buildStaffTimeEvents(),
        invoices: billing.invoices,
        payments: billing.payments,
        nextReceiptSequence: billing.nextReceiptSequence,
        activityNotes: buildActivityNotes(),
        childDocuments: buildChildDocuments(),
      },
    };
  }
  return cache.seed;
}
