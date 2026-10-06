"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Building2, CircleCheck, LoaderCircle, MapPin, Receipt } from "lucide-react";
import type { Organization } from "@/types/domain";
import { FormAlert } from "@/components/shared/form-alert";
import { useOrganization } from "@/components/shared/organization-provider";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { applyServerErrors, callAction } from "@/lib/client/server-form";
import { updateOrganizationAction } from "@/lib/server/actions";
import { updateOrganizationSchema, type UpdateOrganizationInput } from "@/lib/validation/mutations";
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

const FIELDS = [
  "legalName",
  "website",
  "timezone",
  "currency",
  "expectedArrivalBy",
  "addressLine1",
  "addressLine2",
  "city",
  "stateRegion",
  "postalCode",
  "country",
  "phone",
  "email",
  "receiptBusinessName",
  "receiptTaxId",
  "receiptPrefix",
  "receiptFooter",
] as const;

function toValues(org: Organization): UpdateOrganizationInput {
  return {
    legalName: org.legalName ?? "",
    website: org.website ?? "",
    timezone: org.timezone,
    currency: org.currency,
    expectedArrivalBy: org.expectedArrivalBy,
    addressLine1: org.addressLine1 ?? "",
    addressLine2: org.addressLine2 ?? "",
    city: org.city ?? "",
    stateRegion: org.stateRegion ?? "",
    postalCode: org.postalCode ?? "",
    country: org.country ?? "",
    phone: org.phone ?? "",
    email: org.email ?? "",
    receiptBusinessName: org.receipt.businessName,
    receiptTaxId: org.receipt.taxId ?? "",
    receiptPrefix: org.receipt.receiptPrefix,
    receiptFooter: org.receipt.footerNote ?? "",
  };
}

/** Organization settings — persisted to D1 (organizations + organization_branding), owner/admin only. */
export function OrganizationSettingsForm() {
  const org = useOrganization();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string>();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty, isSubmitting },
    reset,
  } = useForm<UpdateOrganizationInput>({ resolver: zodResolver(updateOrganizationSchema), defaultValues: toValues(org) });

  const onSubmit = async (values: UpdateOrganizationInput) => {
    setFormError(undefined);
    const result = await callAction(() => updateOrganizationAction(values));
    if (!result.ok) return setFormError(applyServerErrors(result, setError, FIELDS));
    reset(toValues(result.data));
    setSaved(true);
    router.refresh();
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
          <Field id="timezone" label="Timezone" hint="IANA name, e.g. America/Belize. All times are stored in UTC and shown in this zone." error={errors.timezone?.message}>
            <Input id="timezone" aria-invalid={!!errors.timezone} {...register("timezone")} />
          </Field>
          <Field id="currency" label="Currency" hint="3-letter code, e.g. BZD, USD" error={errors.currency?.message}>
            <Input id="currency" maxLength={3} className="uppercase" aria-invalid={!!errors.currency} {...register("currency")} />
          </Field>
          <Field id="expectedArrivalBy" label="Expected arrival by" hint="Used for the “not checked in” alert" error={errors.expectedArrivalBy?.message}>
            <Input id="expectedArrivalBy" type="time" aria-invalid={!!errors.expectedArrivalBy} {...register("expectedArrivalBy")} />
          </Field>
        </Section>

        <Section icon={<MapPin />} title="Contact & address" description="Shown to families and printed on receipts.">
          <Field id="phone" label="Phone" error={errors.phone?.message}>
            <Input id="phone" type="tel" aria-invalid={!!errors.phone} {...register("phone")} />
          </Field>
          <Field id="email" label="Email" error={errors.email?.message}>
            <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
          </Field>
          <Field id="addressLine1" label="Address line 1" error={errors.addressLine1?.message}>
            <Input id="addressLine1" {...register("addressLine1")} />
          </Field>
          <Field id="addressLine2" label="Address line 2" error={errors.addressLine2?.message}>
            <Input id="addressLine2" {...register("addressLine2")} />
          </Field>
          <Field id="city" label="City" error={errors.city?.message}>
            <Input id="city" {...register("city")} />
          </Field>
          <Field id="stateRegion" label="State / district" error={errors.stateRegion?.message}>
            <Input id="stateRegion" {...register("stateRegion")} />
          </Field>
          <Field id="postalCode" label="Postal code" error={errors.postalCode?.message}>
            <Input id="postalCode" {...register("postalCode")} />
          </Field>
          <Field id="country" label="Country" error={errors.country?.message}>
            <Input id="country" {...register("country")} />
          </Field>
        </Section>

        <Section icon={<Receipt />} title="Receipts" description="Printed on every payment receipt.">
          <Field id="receiptBusinessName" label="Business name on receipt" hint="Defaults to the legal name" error={errors.receiptBusinessName?.message}>
            <Input id="receiptBusinessName" {...register("receiptBusinessName")} />
          </Field>
          <Field id="receiptTaxId" label="Tax / registration ID" error={errors.receiptTaxId?.message}>
            <Input id="receiptTaxId" {...register("receiptTaxId")} />
          </Field>
          <Field id="receiptPrefix" label="Receipt number prefix" error={errors.receiptPrefix?.message}>
            <Input id="receiptPrefix" maxLength={6} aria-invalid={!!errors.receiptPrefix} {...register("receiptPrefix")} />
          </Field>
          <Field id="receiptFooter" label="Footer note" error={errors.receiptFooter?.message}>
            <Input id="receiptFooter" {...register("receiptFooter")} />
          </Field>
        </Section>

        <div className="sticky bottom-4 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-line bg-surface/90 p-3 shadow-lift backdrop-blur">
          <FormAlert message={formError} className="mr-auto" />
          {saved && !isDirty && (
            <span role="status" className="inline-flex items-center gap-1.5 text-sm font-semibold text-success">
              <CircleCheck className="size-4" aria-hidden="true" /> Saved
            </span>
          )}
          <Button type="button" variant="outline" disabled={!isDirty || isSubmitting} onClick={() => reset()}>
            Discard
          </Button>
          <Button type="submit" disabled={!isDirty || isSubmitting}>
            {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            Save changes
          </Button>
        </div>
      </form>
    </div>
  );
}
