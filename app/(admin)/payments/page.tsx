import type { Metadata } from "next";
import { PaymentsWorkspace } from "@/components/payments/payments-workspace";
import { getActiveOrganization, getNextReceiptSequence, listChildren, listInvoices, listPayments } from "@/lib/data";

export const metadata: Metadata = { title: "Payments" };

export default async function PaymentsPage({ searchParams }: PageProps<"/payments">) {
  const { record, child } = await searchParams;
  const org = await getActiveOrganization();
  const [roster, invoices, payments, nextReceipt] = await Promise.all([
    listChildren(org.id),
    listInvoices(org.id),
    listPayments(org.id),
    getNextReceiptSequence(),
  ]);
  return (
    <PaymentsWorkspace
      roster={roster}
      invoices={invoices}
      payments={payments}
      nextReceiptSequence={nextReceipt}
      openRecord={record === "1"}
      initialChildId={typeof child === "string" ? child : undefined}
    />
  );
}
