import type { Invoice, Payment } from "@/types/domain";

export interface ChildBalance {
  childId: string;
  guardianId: string;
  invoiced: number;
  paid: number;
  outstanding: number;
  hasOverdue: boolean;
  nextDueOn?: string;
}

/** Balance per child = non-void invoices − payments. Derived, never stored. */
export function childBalances(invoices: Invoice[], payments: Payment[]): ChildBalance[] {
  const map = new Map<string, ChildBalance>();
  for (const inv of invoices) {
    if (inv.status === "VOID") continue;
    const b = map.get(inv.childId) ?? {
      childId: inv.childId,
      guardianId: inv.guardianId,
      invoiced: 0,
      paid: 0,
      outstanding: 0,
      hasOverdue: false,
    };
    b.invoiced += inv.amount;
    if (inv.status === "OVERDUE") b.hasOverdue = true;
    if (inv.status === "OPEN" || inv.status === "OVERDUE") {
      if (!b.nextDueOn || inv.dueOn < b.nextDueOn) b.nextDueOn = inv.dueOn;
    }
    map.set(inv.childId, b);
  }
  for (const p of payments) {
    const b = map.get(p.childId);
    if (b) b.paid += p.amount;
  }
  return Array.from(map.values()).map((b) => {
    const outstanding = Math.max(0, Math.round((b.invoiced - b.paid) * 100) / 100);
    return { ...b, outstanding, hasOverdue: b.hasOverdue && outstanding > 0 };
  });
}
