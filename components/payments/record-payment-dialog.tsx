"use client";

import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Banknote, CircleEllipsis, CreditCard, Landmark } from "lucide-react";
import type { PaymentMethod } from "@/types/domain";
import type { ChildRecord } from "@/types/domain";
import type { ChildBalance } from "@/lib/domain/billing";
import { DemoBadge } from "@/components/shared/demo-badge";
import { useOrganization } from "@/components/shared/organization-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, formatCurrency, fullName } from "@/lib/utils";
import { paymentFormSchema, type PaymentFormValues } from "@/lib/validation/schemas";

const METHODS: Array<{ value: PaymentMethod; label: string; icon: typeof Banknote }> = [
  { value: "CASH", label: "Cash", icon: Banknote },
  { value: "BANK_TRANSFER", label: "Bank Transfer", icon: Landmark },
  { value: "CARD", label: "Card", icon: CreditCard },
  { value: "OTHER", label: "Other", icon: CircleEllipsis },
];

export function RecordPaymentDialog({
  open,
  onOpenChange,
  roster,
  balances,
  initialChildId,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roster: ChildRecord[];
  balances: Map<string, ChildBalance>;
  initialChildId?: string;
  onSubmit: (values: PaymentFormValues) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>Log a payment received at the front desk and generate a receipt.</DialogDescription>
          <DemoBadge className="mt-2 self-start">No payment processor · session only</DemoBadge>
        </DialogHeader>
        {/* Content unmounts when closed, so the form re-initialises with fresh defaults on every open. */}
        <RecordPaymentForm roster={roster} balances={balances} initialChildId={initialChildId} onSubmit={onSubmit} onCancel={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function RecordPaymentForm({
  roster,
  balances,
  initialChildId,
  onSubmit,
  onCancel,
}: {
  roster: ChildRecord[];
  balances: Map<string, ChildBalance>;
  initialChildId?: string;
  onSubmit: (values: PaymentFormValues) => void;
  onCancel: () => void;
}) {
  const org = useOrganization();
  const primaryOf = (childId?: string) => roster.find((c) => c.id === childId)?.guardians.find((g) => g.link.isPrimary)?.guardian.id ?? "";
  const initialDue = initialChildId ? balances.get(initialChildId)?.outstanding : undefined;
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      childId: initialChildId ?? "",
      guardianId: primaryOf(initialChildId),
      method: "CASH",
      reference: "",
      ...(initialDue ? { amount: initialDue } : {}),
    },
  });

  const childId = useWatch({ control, name: "childId" });
  const child = roster.find((c) => c.id === childId);
  const balance = childId ? balances.get(childId) : undefined;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label id="pay-child">Child</Label>
          <Controller
            control={control}
            name="childId"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  setValue("guardianId", primaryOf(v));
                  const due = balances.get(v)?.outstanding;
                  if (due) setValue("amount", due);
                }}
              >
                <SelectTrigger aria-labelledby="pay-child" aria-invalid={!!errors.childId}>
                  <SelectValue placeholder="Select a child" />
                </SelectTrigger>
                <SelectContent>
                  {[...roster]
                    .sort((a, b) => a.firstName.localeCompare(b.firstName))
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {fullName(c)}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.childId?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label id="pay-guardian">Guardian</Label>
          <Controller
            control={control}
            name="guardianId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={!child}>
                <SelectTrigger aria-labelledby="pay-guardian" aria-invalid={!!errors.guardianId}>
                  <SelectValue placeholder="Select a guardian" />
                </SelectTrigger>
                <SelectContent>
                  {child?.guardians.map((g) => (
                    <SelectItem key={g.guardian.id} value={g.guardian.id}>
                      {fullName(g.guardian)} ({g.link.relationship})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError message={errors.guardianId?.message} />
        </div>
      </div>

      {child && (
        <p className="-mt-2 rounded-xl bg-muted px-3 py-2 text-sm text-ink-muted">
          Current balance:{" "}
          <strong className={balance && balance.outstanding > 0 ? "text-danger" : "text-success"}>
            {formatCurrency(balance?.outstanding ?? 0, org.currency)}
          </strong>
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Amount ({org.currency})</Label>
          <Input id="amount" type="number" inputMode="decimal" step="0.01" min="0" aria-invalid={!!errors.amount} {...register("amount", { valueAsNumber: true })} />
          <FieldError message={errors.amount?.message} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="reference">Reference (optional)</Label>
          <Input id="reference" placeholder="Transfer ID, card slip #…" {...register("reference")} />
        </div>
      </div>

      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-ink">Payment method</legend>
        <Controller
          control={control}
          name="method"
          render={({ field }) => (
            <div role="radiogroup" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {METHODS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={field.value === value}
                  onClick={() => field.onChange(value)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-sm font-semibold transition-colors",
                    field.value === value ? "border-primary bg-primary/8 text-primary ring-2 ring-primary/20" : "border-line text-ink-muted hover:bg-muted",
                  )}
                >
                  <Icon className="size-5" aria-hidden="true" />
                  {label}
                </button>
              ))}
            </div>
          )}
        />
      </fieldset>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">Record & create receipt</Button>
      </div>
    </form>
  );
}
