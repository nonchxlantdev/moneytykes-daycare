"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CircleAlert, Plus, Printer, ReceiptText, TrendingUp, UsersRound, Wallet } from "lucide-react";
import type { Invoice, Payment } from "@/types/domain";
import type { ChildRecord } from "@/lib/data";
import { ChildAvatar } from "@/components/shared/child-avatar";
import { EmptyState } from "@/components/shared/empty-state";
import { useOrganization } from "@/components/shared/organization-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { childBalances } from "@/lib/domain/billing";
import { useDemoStore } from "@/lib/store/demo-store";
import { cn, dateKey, formatCalendarDate, formatCurrency, formatDate, fullName } from "@/lib/utils";
import type { PaymentFormValues } from "@/lib/validation/schemas";
import { methodLabel } from "./payment-labels";
import { ReceiptPreview } from "./receipt-preview";
import { RecordPaymentDialog } from "./record-payment-dialog";

export function PaymentsWorkspace({
  roster,
  invoices,
  payments: seeded,
  nextReceiptSequence,
  openRecord,
  initialChildId,
}: {
  roster: ChildRecord[];
  invoices: Invoice[];
  payments: Payment[];
  nextReceiptSequence: number;
  openRecord: boolean;
  initialChildId?: string;
}) {
  const org = useOrganization();
  const { sessionPayments, recordPayment } = useDemoStore();
  const [recordOpen, setRecordOpen] = useState(openRecord);
  const [recordChild, setRecordChild] = useState<string | undefined>(initialChildId);
  const [receiptId, setReceiptId] = useState<string>();

  const payments = useMemo(() => [...sessionPayments, ...seeded], [sessionPayments, seeded]);
  const balances = useMemo(() => new Map(childBalances(invoices, payments).map((b) => [b.childId, b])), [invoices, payments]);
  const byChild = useMemo(() => new Map(roster.map((c) => [c.id, c])), [roster]);
  const outstanding = [...balances.values()].filter((b) => b.outstanding > 0).sort((a, b) => b.outstanding - a.outstanding);
  const totalOutstanding = outstanding.reduce((a, b) => a + b.outstanding, 0);
  const month = dateKey(new Date(), org.timezone).slice(0, 7);
  const collectedThisMonth = payments.filter((p) => dateKey(p.receivedAt, org.timezone).startsWith(month)).reduce((a, p) => a + p.amount, 0);

  const guardianName = (childId: string, guardianId: string) => {
    const g = byChild.get(childId)?.guardians.find((x) => x.guardian.id === guardianId)?.guardian;
    return g ? fullName(g) : "—";
  };

  const openRecordFor = (childId?: string) => {
    setRecordChild(childId);
    setRecordOpen(true);
  };

  const submit = (v: PaymentFormValues) => {
    const seq = nextReceiptSequence + sessionPayments.length;
    const payment = recordPayment({
      organizationId: org.id,
      childId: v.childId,
      guardianId: v.guardianId,
      amount: Math.round(v.amount * 100) / 100,
      method: v.method,
      reference: v.reference || undefined,
      receivedAt: new Date().toISOString(),
      recordedByUserId: "usr_sarah_johnson",
      receiptNumber: `${org.receipt.receiptPrefix}-${seq}`,
    });
    setRecordOpen(false);
    setReceiptId(payment.id);
  };

  const receipt = payments.find((p) => p.id === receiptId);
  const stats = [
    { label: "Outstanding", value: formatCurrency(totalOutstanding, org.currency), icon: Wallet, tone: "bg-danger/10 text-danger" },
    { label: "Families with balance", value: new Set(outstanding.map((b) => b.guardianId)).size, icon: UsersRound, tone: "bg-warning/15 text-warning" },
    { label: "Collected this month", value: formatCurrency(collectedThisMonth, org.currency), icon: TrendingUp, tone: "bg-success/12 text-success" },
    { label: "Overdue accounts", value: outstanding.filter((b) => b.hasOverdue).length, icon: CircleAlert, tone: "bg-brand-secondary/12 text-brand-secondary" },
  ];

  return (
    <div className="mx-auto flex max-w-[1400px] flex-col gap-6 animate-in fade-in-0 duration-500">
      <PageHeader
        title="Payments"
        description="Record front-desk payments and issue receipts. Online card processing comes later."
        actions={
          <Button onClick={() => openRecordFor(undefined)}>
            <Plus /> Record Payment
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon, tone }) => (
          <Card key={label} className="flex items-center gap-4 p-4">
            <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", tone)}>
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xl font-extrabold text-ink tabular sm:text-2xl">{value}</p>
              <p className="text-sm text-ink-muted">{label}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Outstanding balances</CardTitle>
            <Badge tone="warning">{outstanding.length} accounts</Badge>
          </CardHeader>
          {outstanding.length === 0 ? (
            <EmptyState icon={Wallet} title="Everyone is paid up" />
          ) : (
            <ul className="divide-y divide-line border-t border-line">
              {outstanding.map((b) => {
                const child = byChild.get(b.childId);
                if (!child) return null;
                return (
                  <li key={b.childId} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <ChildAvatar name={fullName(child)} size="sm" />
                    <div className="min-w-0 flex-1">
                      <Link href={`/children/${child.id}`} className="font-bold text-ink hover:text-primary">
                        {fullName(child)}
                      </Link>
                      <p className="text-xs text-ink-muted">
                        {guardianName(child.id, b.guardianId)}
                        {b.nextDueOn && ` · due ${formatCalendarDate(b.nextDueOn, "short")}`}
                      </p>
                    </div>
                    {b.hasOverdue && <Badge tone="danger">Overdue</Badge>}
                    <span className="w-24 text-right font-extrabold text-ink tabular">{formatCurrency(b.outstanding, org.currency)}</span>
                    <Button size="sm" variant="soft" onClick={() => openRecordFor(child.id)}>
                      Record
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Recent payments</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Receipt</TableHead>
                <TableHead>Child</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>
                  <span className="sr-only">Receipt</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.slice(0, 12).map((p) => {
                const child = byChild.get(p.childId);
                const isNew = sessionPayments.some((s) => s.id === p.id);
                return (
                  <TableRow key={p.id} className={isNew ? "bg-success/[0.06]" : undefined}>
                    <TableCell className="font-mono text-xs font-bold">
                      {p.receiptNumber}
                      {isNew && <Badge tone="success" className="ml-2 font-sans">New</Badge>}
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">{child ? fullName(child) : "—"}</span>
                      <span className="block text-xs text-ink-muted">{guardianName(p.childId, p.guardianId)}</span>
                    </TableCell>
                    <TableCell className="text-ink-muted">{methodLabel[p.method]}</TableCell>
                    <TableCell className="text-ink-muted">{formatDate(p.receivedAt, org.timezone, "short")}</TableCell>
                    <TableCell className="text-right font-bold tabular">{formatCurrency(p.amount, org.currency)}</TableCell>
                    <TableCell>
                      <Button size="icon-sm" variant="ghost" aria-label={`View receipt ${p.receiptNumber}`} onClick={() => setReceiptId(p.id)}>
                        <ReceiptText />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </div>

      <RecordPaymentDialog
        open={recordOpen}
        onOpenChange={setRecordOpen}
        roster={roster}
        balances={balances}
        initialChildId={recordChild}
        onSubmit={submit}
      />

      <Dialog open={!!receipt} onOpenChange={(o) => !o && setReceiptId(undefined)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Receipt preview</DialogTitle>
          </DialogHeader>
          {receipt && (
            <>
              <ReceiptPreview
                payment={receipt}
                childName={byChild.get(receipt.childId) ? fullName(byChild.get(receipt.childId)!) : "—"}
                guardianName={guardianName(receipt.childId, receipt.guardianId)}
                balanceAfter={balances.get(receipt.childId)?.outstanding}
              />
              <CardContent className="flex justify-end gap-2 px-0 pt-4 pb-0">
                <Button variant="outline" onClick={() => window.print()}>
                  <Printer /> Print
                </Button>
                <Button onClick={() => setReceiptId(undefined)}>Done</Button>
              </CardContent>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
