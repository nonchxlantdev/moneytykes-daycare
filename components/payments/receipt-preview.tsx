"use client";

import type { Payment } from "@/types/domain";
import { OrganizationLogo } from "@/components/shared/organization-logo";
import { useOrganization } from "@/components/shared/organization-provider";
import { formatCurrency, formatDate, formatTime } from "@/lib/utils";
import { methodLabel } from "./payment-labels";

/** Printable receipt rendered from tenant receipt identity + a payment. */
export function ReceiptPreview({
  payment,
  childName,
  guardianName,
  balanceAfter,
}: {
  payment: Payment;
  childName: string;
  guardianName: string;
  balanceAfter?: number;
}) {
  const org = useOrganization();
  const rows = [
    { label: "Received from", value: guardianName },
    { label: "For", value: childName },
    { label: "Payment method", value: methodLabel[payment.method] },
    ...(payment.reference ? [{ label: "Reference", value: payment.reference }] : []),
    { label: "Date", value: `${formatDate(payment.receivedAt, org.timezone)} · ${formatTime(payment.receivedAt, org.timezone)}` },
  ];

  return (
    <article id="receipt" className="relative overflow-hidden rounded-2xl border border-line bg-surface" aria-label={`Receipt ${payment.receiptNumber}`}>
      <div className="h-2 bg-gradient-to-r from-primary via-brand-secondary to-brand-accent" aria-hidden="true" />
      <div className="p-6">
        <header className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <OrganizationLogo name={org.name} logoUrl={org.branding.logoUrl} size={44} />
            <div>
              <p className="font-extrabold text-ink">{org.receipt.businessName}</p>
              <p className="text-xs text-ink-muted">{org.address}</p>
              <p className="text-xs text-ink-muted">
                {org.phone} · {org.email}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold tracking-wide text-ink-subtle uppercase">Receipt</p>
            <p className="font-mono text-sm font-bold whitespace-nowrap text-ink">{payment.receiptNumber}</p>
          </div>
        </header>

        <div className="my-6 rounded-xl bg-success/10 py-5 text-center">
          <p className="text-xs font-bold tracking-wide text-[color-mix(in_oklab,var(--brand-success)_75%,black)] uppercase">Amount paid</p>
          <p className="mt-1 text-4xl font-extrabold text-ink tabular">{formatCurrency(payment.amount, org.currency)}</p>
        </div>

        <dl className="divide-y divide-dashed divide-line text-sm">
          {rows.map((r) => (
            <div key={r.label} className="flex justify-between gap-4 py-2">
              <dt className="text-ink-muted">{r.label}</dt>
              <dd className="text-right font-semibold text-ink">{r.value}</dd>
            </div>
          ))}
          {balanceAfter !== undefined && (
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-ink-muted">Remaining balance</dt>
              <dd className="font-semibold text-ink tabular">{formatCurrency(balanceAfter, org.currency)}</dd>
            </div>
          )}
        </dl>

        <footer className="mt-6 border-t border-line pt-4 text-center text-xs text-ink-muted">
          {org.receipt.footerNote && <p className="font-semibold text-ink">{org.receipt.footerNote}</p>}
          {org.receipt.taxId && <p className="mt-1">{org.receipt.taxId}</p>}
        </footer>
      </div>
    </article>
  );
}
