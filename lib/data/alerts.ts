import type { AlertInputs } from "@/lib/hooks/use-today-alerts";
import { childBalances } from "@/lib/domain/billing";
import { fullName } from "@/lib/utils/people";
import { listChildren, listInvoices, listPayments, listStaff } from "./index";

/** Inputs for live alert derivation (attendance part is computed client-side from events). */
export async function getAlertInputs(organizationId: string): Promise<AlertInputs> {
  const [kids, staff, invoices, payments] = await Promise.all([
    listChildren(organizationId),
    listStaff(organizationId),
    listInvoices(organizationId),
    listPayments(organizationId),
  ]);
  return {
    children: kids
      .filter((c) => c.enrollmentStatus === "ACTIVE")
      .map(({ id, firstName, lastName }) => ({ id, firstName, lastName })),
    staffOnLeave: staff
      .filter((s) => s.employmentStatus === "ON_LEAVE")
      .map((s) => ({ name: fullName(s), reason: s.leaveReason ?? "Leave" })),
    outstandingFamilies: new Set(
      childBalances(invoices, payments)
        .filter((b) => b.outstanding > 0)
        .map((b) => b.guardianId),
    ).size,
  };
}
