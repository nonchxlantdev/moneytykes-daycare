import type { ClassroomId, Invoice, Payment } from "@/types/domain";
import { mockChildren } from "./children";
import { demoDate, demoTime } from "./demo-clock";
import { mockChildGuardians } from "./guardians";
import { ORG_ID, mockOrganization } from "./organization";

export const monthlyTuition: Record<ClassroomId, number> = {
  infants: 450,
  toddlers: 400,
  preschool: 375,
  "pre-k": 350,
};

/** Families with an outstanding balance this cycle. */
const unpaidChildIds = new Set(["noah-brown", "olivia-martin", "henry-adams", "zoe-king"]);
const overdueChildIds = new Set(["henry-adams"]);

const methods: Payment["method"][] = ["BANK_TRANSFER", "CASH", "CARD", "BANK_TRANSFER", "CASH", "OTHER"];

function primaryGuardian(childId: string): string {
  const link = mockChildGuardians.find((l) => l.childId === childId && l.isPrimary);
  return link?.guardianId ?? "";
}

export function buildBilling(): { invoices: Invoice[]; payments: Payment[]; nextReceiptSequence: number } {
  const invoices: Invoice[] = [];
  const payments: Payment[] = [];
  let receiptSeq = 1180;

  mockChildren.forEach((child, i) => {
    const guardianId = primaryGuardian(child.id);
    const amount = monthlyTuition[child.classroomId];

    // Previous cycle (all paid except overdue family).
    const prevId = `inv_prev_${child.id}`;
    const prevOverdue = overdueChildIds.has(child.id);
    invoices.push({
      id: prevId,
      organizationId: ORG_ID,
      childId: child.id,
      guardianId,
      number: `INV-${2400 + i}`,
      description: "Monthly tuition — previous cycle",
      amount,
      issuedOn: demoDate(35),
      dueOn: demoDate(28),
      status: prevOverdue ? "OVERDUE" : "PAID",
    });
    if (!prevOverdue) {
      payments.push({
        id: `pay_prev_${child.id}`,
        organizationId: ORG_ID,
        childId: child.id,
        guardianId,
        invoiceId: prevId,
        amount,
        method: methods[i % methods.length],
        receivedAt: demoTime(`${String(8 + (i % 8)).padStart(2, "0")}:${String((i * 7) % 60).padStart(2, "0")}`, 30 + (i % 4)),
        recordedByUserId: "usr_sarah_johnson",
        receiptNumber: `${mockOrganization.receipt.receiptPrefix}-${receiptSeq++}`,
      });
    }

    // Current cycle, due this week.
    const curId = `inv_cur_${child.id}`;
    const unpaid = unpaidChildIds.has(child.id);
    invoices.push({
      id: curId,
      organizationId: ORG_ID,
      childId: child.id,
      guardianId,
      number: `INV-${2500 + i}`,
      description: "Monthly tuition — current cycle",
      amount,
      issuedOn: demoDate(6),
      dueOn: demoDate(-3),
      status: unpaid ? "OPEN" : "PAID",
    });
    if (!unpaid) {
      payments.push({
        id: `pay_cur_${child.id}`,
        organizationId: ORG_ID,
        childId: child.id,
        guardianId,
        invoiceId: curId,
        amount,
        method: methods[(i + 2) % methods.length],
        reference: i % 3 === 0 ? `TRX-${88000 + i * 13}` : undefined,
        receivedAt: demoTime(`${String(7 + (i % 10)).padStart(2, "0")}:${String((i * 11) % 60).padStart(2, "0")}`, i % 6),
        recordedByUserId: "usr_sarah_johnson",
        receiptNumber: `${mockOrganization.receipt.receiptPrefix}-${receiptSeq++}`,
      });
    }
  });
  return {
    invoices,
    payments: payments.sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
    nextReceiptSequence: receiptSeq,
  };
}
