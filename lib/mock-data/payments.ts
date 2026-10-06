/**
 * ⚠️ MOCK BILLING — Phase 2 keeps payments as demo data (no invoices or
 * payments tables yet; see README "Phase 3 roadmap").
 *
 * Generated deterministically from the organization's REAL children
 * (from D1), so balances line up with the real roster. Nothing here is
 * persisted; recorded payments live only in the browser session.
 */
import type { ChildRecord, Invoice, Payment } from "@/types/domain";
import { hashToIndex } from "@/lib/utils/people";
import { addDays } from "@/lib/utils/timezone";

const TUITION_BY_CLASS_NAME: Record<string, number> = { infants: 450, toddlers: 400, preschool: 375, "pre-k": 350 };
const DEFAULT_TUITION = 375;
const METHODS: Payment["method"][] = ["BANK_TRANSFER", "CASH", "CARD", "BANK_TRANSFER", "CASH", "OTHER"];

export interface MockBilling {
  invoices: Invoice[];
  payments: Payment[];
  nextReceiptSequence: number;
}

export function buildMockBilling(
  roster: ChildRecord[],
  classroomNames: Map<string, string>,
  opts: { organizationId: string; receiptPrefix: string; today: string },
): MockBilling {
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  let seq = 1180;
  const at = (date: string, hour: number) => `${date}T${String(14 + (hour % 8)).padStart(2, "0")}:00:00.000Z`;

  roster
    .filter((c) => c.enrollmentStatus === "ACTIVE")
    .forEach((child, i) => {
      const guardianId = child.guardians.find((g) => g.link.isPrimary)?.guardian.id ?? child.guardians[0]?.guardian.id ?? "";
      const className = classroomNames.get(child.classroomId ?? "")?.toLowerCase() ?? "";
      const amount = TUITION_BY_CLASS_NAME[className] ?? DEFAULT_TUITION;
      const bucket = hashToIndex(child.id, 9); // ~2/9 unpaid this cycle, ~1/9 also overdue
      const unpaid = bucket < 2;
      const overdue = bucket === 0;

      const prevId = `inv_prev_${child.id}`;
      invoices.push({
        id: prevId,
        organizationId: opts.organizationId,
        childId: child.id,
        guardianId,
        number: `INV-${2400 + i}`,
        description: "Monthly tuition — previous cycle",
        amount,
        issuedOn: addDays(opts.today, -35),
        dueOn: addDays(opts.today, -28),
        status: overdue ? "OVERDUE" : "PAID",
      });
      if (!overdue) {
        payments.push({
          id: `pay_prev_${child.id}`,
          organizationId: opts.organizationId,
          childId: child.id,
          guardianId,
          invoiceId: prevId,
          amount,
          method: METHODS[i % METHODS.length],
          receivedAt: at(addDays(opts.today, -30 - (i % 4)), i),
          recordedByUserId: "mock",
          receiptNumber: `${opts.receiptPrefix}-${seq++}`,
        });
      }

      const curId = `inv_cur_${child.id}`;
      invoices.push({
        id: curId,
        organizationId: opts.organizationId,
        childId: child.id,
        guardianId,
        number: `INV-${2500 + i}`,
        description: "Monthly tuition — current cycle",
        amount,
        issuedOn: addDays(opts.today, -6),
        dueOn: addDays(opts.today, 3),
        status: unpaid ? "OPEN" : "PAID",
      });
      if (!unpaid) {
        payments.push({
          id: `pay_cur_${child.id}`,
          organizationId: opts.organizationId,
          childId: child.id,
          guardianId,
          invoiceId: curId,
          amount,
          method: METHODS[(i + 2) % METHODS.length],
          reference: i % 3 === 0 ? `TRX-${88000 + i * 13}` : undefined,
          receivedAt: at(addDays(opts.today, -(i % 6)), i + 3),
          recordedByUserId: "mock",
          receiptNumber: `${opts.receiptPrefix}-${seq++}`,
        });
      }
    });

  return { invoices, payments: payments.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)), nextReceiptSequence: seq };
}
