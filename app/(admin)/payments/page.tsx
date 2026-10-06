import type { Metadata } from "next";
import { PaymentsWorkspace } from "@/components/payments/payments-workspace";
import { requirePagePermission } from "@/lib/auth/tenant";
import { getChildRecords, getMockBilling } from "@/lib/data";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage({ searchParams }: PageProps<"/payments">) {
  await requirePagePermission("payments:view");
  const { record, child } = await searchParams;
  const [roster, billing] = await Promise.all([getChildRecords(), getMockBilling()]);
  return (
    <PaymentsWorkspace
      roster={roster}
      invoices={billing.invoices}
      payments={billing.payments}
      nextReceiptSequence={billing.nextReceiptSequence}
      openRecord={record === "1"}
      initialChildId={typeof child === "string" ? child : undefined}
    />
  );
}
