"use client";

import { useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, Receipt, Tablet, Building2 } from "lucide-react";
import { DemoBadge } from "@/components/shared/demo-badge";
import { useOrganizationContext } from "@/components/shared/organization-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { organizationSettingsSchema, type OrganizationSettingsValues } from "@/lib/validation/schemas";
import { SettingsNav } from "./settings-nav";

function Section({ icon, title, description, children }: { icon: ReactNode; title: string; description: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader className="items-start justify-start">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&_svg]:size-5">{icon}</span>
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">{children}</CardContent>
    </Card>
  );
}

function Field({ id, label, error, hint, children }: { id: string; label: string; error?: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-ink-subtle">{hint}</p>}
      <FieldError message={error} />
    </div>
  );
}

export function OrganizationSettingsForm() {
  const { organization: org, applyOrganizationPreview } = useOrganizationContext();
  const [saved, setSaved] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
    reset,
  } = useForm<OrganizationSettingsValues>({
    resolver: zodResolver(organizationSettingsSchema),
    defaultValues: {
      legalName: org.legalName ?? "",
      website: org.website ?? "",
      timezone: org.timezone,
      currency: org.currency,
      expectedArrivalBy: org.expectedArrivalBy,
      kioskWelcomeMessage: org.kioskWelcomeMessage,
      receiptBusinessName: org.receipt.businessName,
      receiptTaxId: org.receipt.taxId ?? "",
      receiptPrefix: org.receipt.receiptPrefix,
      receiptFooterNote: org.receipt.footerNote ?? "",
    },
  });

  const onSubmit = (v: OrganizationSettingsValues) => {
    // Phase 2: server action → re-validate → update organizations (+ audit log), scoped to the admin's org.
    applyOrganizationPreview({
      ...org,
      legalName: v.legalName,
      website: v.website,
      timezone: v.timezone,
      currency: v.currency.toUpperCase(),
      expectedArrivalBy: v.expectedArrivalBy,
      kioskWelcomeMessage: v.kioskWelcomeMessage,
      receipt: { businessName: v.receiptBusinessName, taxId: v.receiptTaxId, receiptPrefix: v.receiptPrefix, footerNote: v.receiptFooterNote },
    });
    reset(v);
    setSaved(true);
  };

  return (
    <div className="mx-auto flex max-w-[1000px] flex-col gap-6 animate-in fade-in-0 duration-500">
      <PageHeader title="Settings" description={`Configuration for ${org.name}.`} actions={<SettingsNav />} />
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6" onChange={() => setSaved(false)}>
        <Section icon={<Building2 />} title="Organization" description="Business details and operating defaults.">
          <Field id="legalName" label="Legal / business name" error={errors.legalName?.message}>
            <Input id="legalName" {...register("legalName")} />
          </Field>
          <Field id="website" label="Website" error={errors.website?.message}>
            <Input id="website" {...register("website")} />
          </Field>
          <Field id="timezone" label="Timezone" hint="IANA name, e.g. America/Belize" error={errors.timezone?.message}>
            <Input id="timezone" {...register("timezone")} />
          </Field>
          <Field id="currency" label="Currency" hint="3-letter code, e.g. BZD, USD" error={errors.currency?.message}>
            <Input id="currency" maxLength={3} className="uppercase" {...register("currency")} />
          </Field>
          <Field id="expectedArrivalBy" label="Expected arrival by" hint="Used for the “not checked in” alert" error={errors.expectedArrivalBy?.message}>
            <Input id="expectedArrivalBy" type="time" {...register("expectedArrivalBy")} />
          </Field>
        </Section>

        <Section icon={<Tablet />} title="Kiosk" description="What families see on the front-desk tablet.">
          <Field id="kioskWelcomeMessage" label="Welcome message" error={errors.kioskWelcomeMessage?.message}>
            <Input id="kioskWelcomeMessage" {...register("kioskWelcomeMessage")} />
          </Field>
        </Section>

        <Section icon={<Receipt />} title="Receipts" description="Printed on every payment receipt.">
          <Field id="receiptBusinessName" label="Business name on receipt" error={errors.receiptBusinessName?.message}>
            <Input id="receiptBusinessName" {...register("receiptBusinessName")} />
          </Field>
          <Field id="receiptTaxId" label="Tax / registration ID" error={errors.receiptTaxId?.message}>
            <Input id="receiptTaxId" {...register("receiptTaxId")} />
          </Field>
          <Field id="receiptPrefix" label="Receipt number prefix" error={errors.receiptPrefix?.message}>
            <Input id="receiptPrefix" maxLength={6} {...register("receiptPrefix")} />
          </Field>
          <Field id="receiptFooterNote" label="Footer note" error={errors.receiptFooterNote?.message}>
            <Input id="receiptFooterNote" {...register("receiptFooterNote")} />
          </Field>
        </Section>

        <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-line bg-surface/90 p-3 shadow-lift backdrop-blur">
          <DemoBadge className="mr-auto">Changes apply to this session only</DemoBadge>
          {saved && (
            <span role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
              <CircleCheck className="size-4" aria-hidden="true" /> Saved
            </span>
          )}
          <Button type="button" variant="outline" disabled={!isDirty} onClick={() => reset()}>
            Discard
          </Button>
          <Button type="submit" disabled={!isDirty}>
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
