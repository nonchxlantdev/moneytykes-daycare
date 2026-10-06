"use client";

import Link from "next/link";
import { Plus } from "lucide-react";
import type { Invoice, Payment } from "@/types/domain";
import { DemoBadge } from "@/components/shared/demo-badge";
import { useOrganization } from "@/components/shared/organization-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { childBalances } from "@/lib/domain/billing";
import { useLiveData } from "@/lib/store/live-data";
import { formatCalendarDate, formatCurrency, formatDate } from "@/lib/utils";
import { methodLabel } from "@/components/payments/payment-labels";

const statusTone = { PAID: "success", OPEN: "warning", OVERDUE: "danger", VOID: "neutral" } as const;

/** Billing is still mock data in Phase 2 (see README). */
export function ChildPaymentsTab({ childId, invoices, payments: seeded }: { childId: string; invoices: Invoice[]; payments: Payment[] }) {
  const org = useOrganization();
  const { sessionPayments } = useLiveData();
  const payments = [...sessionPayments.filter((p) => p.childId === childId), ...seeded];
  const balance = childBalances(invoices, payments)[0];

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card>
        <CardHeader>
          <CardTitle className="text-base sm:text-base">Balance</CardTitle>
          <DemoBadge>Sample data</DemoBadge>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-extrabold text-ink tabular">{formatCurrency(balance?.outstanding ?? 0, org.currency)}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {balance && balance.outstanding > 0
              ? `Outstanding${balance.nextDueOn ? ` · due ${formatCalendarDate(balance.nextDueOn, "short")}` : ""}`
              : "All paid up"}
          </p>
          <Button asChild className="mt-4 w-full">
            <Link href={`/payments?record=1&child=${childId}`}>
              <Plus /> Record payment
            </Link>
          </Button>
        </CardContent>
      </Card>
      <div className="flex flex-col gap-5">
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base sm:text-base">Invoices</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Invoice</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-semibold">{i.number}</TableCell>
                  <TableCell className="text-ink-muted">{i.description}</TableCell>
                  <TableCell>{formatCalendarDate(i.dueOn)}</TableCell>
                  <TableCell className="text-right tabular">{formatCurrency(i.amount, org.currency)}</TableCell>
                  <TableCell>
                    <Badge tone={statusTone[i.status]}>{i.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle className="text-base sm:text-base">Payments</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Receipt</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Method</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-semibold">{p.receiptNumber}</TableCell>
                  <TableCell>{formatDate(p.receivedAt, org.timezone)}</TableCell>
                  <TableCell>{methodLabel[p.method]}</TableCell>
                  <TableCell className="text-right tabular">{formatCurrency(p.amount, org.currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>
    </div>
  );
}
