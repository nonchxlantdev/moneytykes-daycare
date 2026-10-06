"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, LoaderCircle, Sparkles, Tablet, Trash2 } from "lucide-react";
import { FormAlert } from "@/components/shared/form-alert";
import { OrganizationLogo } from "@/components/shared/organization-logo";
import { useOrganization } from "@/components/shared/organization-provider";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { readableForeground } from "@/lib/theme/brand-css-vars";
import { applyServerErrors, callAction } from "@/lib/client/server-form";
import { updateBrandingAction } from "@/lib/server/actions";
import { updateBrandingSchema, type UpdateBrandingInput } from "@/lib/validation/mutations";
import type { Organization } from "@/types/domain";
import { BrandingPreview } from "./branding-preview";

/** Example palettes to demonstrate white-labelling (not tenants). */
const PALETTES = [
  { name: "Sky", primaryColor: "#2f6bea", secondaryColor: "#7c4dff", accentColor: "#f28c28" },
  { name: "Lagoon", primaryColor: "#0f8b8d", secondaryColor: "#3d5a80", accentColor: "#ee6c4d" },
  { name: "Meadow", primaryColor: "#2d8a4e", secondaryColor: "#6a4c93", accentColor: "#f4a259" },
  { name: "Berry", primaryColor: "#c2185b", secondaryColor: "#4a3aff", accentColor: "#ffb400" },
];

function ColorField({ id, label, value, registration, error }: { id: string; label: string; value: string; registration: UseFormRegisterReturn; error?: string }) {
  const valid = /^#([0-9a-f]{6})$/i.test(value);
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <label className="relative size-10 shrink-0 cursor-pointer overflow-hidden rounded-xl border border-line shadow-soft" style={{ backgroundColor: valid ? value : "#ffffff" }}>
          <span className="sr-only">Pick {label.toLowerCase()}</span>
          <input type="color" value={valid ? value : "#000000"} onChange={registration.onChange} name={registration.name} className="absolute inset-0 cursor-pointer opacity-0" />
        </label>
        <Input id={id} {...registration} className="font-mono uppercase" aria-invalid={!!error} />
      </div>
      {valid && (
        <p className="text-xs text-ink-subtle">
          Text on this color: <strong>{readableForeground(value) === "#ffffff" ? "white" : "dark"}</strong>
        </p>
      )}
      <FieldError message={error} />
    </div>
  );
}

const FIELDS = ["name", "tagline", "logoUrl", "primaryColor", "secondaryColor", "accentColor", "kioskWelcomeMessage"] as const;

function toValues(o: Organization): UpdateBrandingInput {
  return {
    name: o.name,
    tagline: o.tagline,
    logoUrl: o.branding.logoUrl ?? "",
    primaryColor: o.branding.primaryColor,
    secondaryColor: o.branding.secondaryColor,
    accentColor: o.branding.accentColor,
    kioskWelcomeMessage: o.kioskWelcomeMessage,
  };
}

/** Branding — persisted to D1 (organizations + organization_branding), owner/admin only. */
export function BrandingSettings() {
  const org = useOrganization();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string>();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    setError,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<UpdateBrandingInput>({ resolver: zodResolver(updateBrandingSchema), defaultValues: toValues(org) });
  const values = useWatch({ control }) as UpdateBrandingInput;

  const onSave = async (v: UpdateBrandingInput) => {
    setFormError(undefined);
    const result = await callAction(() => updateBrandingAction(v));
    if (!result.ok) return setFormError(applyServerErrors(result, setError, FIELDS));
    reset(toValues(result.data));
    setSaved(true);
    router.refresh();
  };

  return (
    <div className="mx-auto flex max-w-[1300px] flex-col gap-6 animate-in fade-in-0 duration-500">
      <PageHeader
        title="Branding"
        description="Make the platform feel like your daycare. Every screen, the kiosk and receipts read from these settings."
        actions={<SettingsNav />}
      />

      <form onSubmit={handleSubmit(onSave)} onChange={() => setSaved(false)} noValidate className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex-col items-start">
              <CardTitle>Identity</CardTitle>
              <CardDescription>Name, tagline and logo shown in the header, kiosk and receipts.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-wrap items-start gap-4 rounded-2xl border border-dashed border-line-strong p-4">
                <OrganizationLogo name={values.name || "Logo"} logoUrl={values.logoUrl || undefined} size={64} />
                <div className="flex min-w-60 flex-1 flex-col gap-1.5">
                  <Label htmlFor="logoUrl">Logo URL</Label>
                  <div className="flex gap-2">
                    <Input id="logoUrl" placeholder="/tenants/my-daycare/logo.svg or https://…" aria-invalid={!!errors.logoUrl} {...register("logoUrl")} />
                    {values.logoUrl && (
                      <Button type="button" variant="ghost" size="icon" aria-label="Remove logo" onClick={() => setValue("logoUrl", "", { shouldDirty: true })}>
                        <Trash2 />
                      </Button>
                    )}
                  </div>
                  <FieldError message={errors.logoUrl?.message} />
                  <p className="text-xs text-ink-muted">
                    A site path or https URL to a square PNG, SVG or WebP. Logo uploads arrive with file storage in a later phase. Without a logo we show a monogram.
                  </p>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="name">Daycare name</Label>
                  <Input id="name" aria-invalid={!!errors.name} {...register("name")} />
                  <FieldError message={errors.name?.message} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tagline">Tagline</Label>
                  <Input id="tagline" {...register("tagline")} />
                  <FieldError message={errors.tagline?.message} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-col items-start">
              <CardTitle>Colors</CardTitle>
              <CardDescription>Status colors (success, warning, danger) stay consistent for safety and accessibility.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-wrap gap-2">
                <span className="mr-1 inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted">
                  <Sparkles className="size-4" aria-hidden="true" /> Try a palette:
                </span>
                {PALETTES.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => {
                      setValue("primaryColor", p.primaryColor, { shouldDirty: true, shouldValidate: true });
                      setValue("secondaryColor", p.secondaryColor, { shouldDirty: true, shouldValidate: true });
                      setValue("accentColor", p.accentColor, { shouldDirty: true, shouldValidate: true });
                    }}
                    className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface pr-3 pl-1.5 text-sm font-semibold text-ink hover:bg-muted"
                  >
                    <span className="flex -space-x-1.5" aria-hidden="true">
                      {[p.primaryColor, p.secondaryColor, p.accentColor].map((c) => (
                        <span key={c} className="size-5 rounded-full ring-2 ring-surface" style={{ backgroundColor: c }} />
                      ))}
                    </span>
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <ColorField id="primaryColor" label="Primary color" value={values.primaryColor} registration={register("primaryColor")} error={errors.primaryColor?.message} />
                <ColorField id="secondaryColor" label="Secondary color" value={values.secondaryColor} registration={register("secondaryColor")} error={errors.secondaryColor?.message} />
                <ColorField id="accentColor" label="Accent color" value={values.accentColor} registration={register("accentColor")} error={errors.accentColor?.message} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-col items-start">
              <CardTitle className="flex items-center gap-2">
                <Tablet className="size-5 text-primary" aria-hidden="true" /> Kiosk
              </CardTitle>
              <CardDescription>The greeting families see on the front-desk tablet.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="kioskWelcomeMessage">Welcome message</Label>
                <Input id="kioskWelcomeMessage" aria-invalid={!!errors.kioskWelcomeMessage} {...register("kioskWelcomeMessage")} />
                <FieldError message={errors.kioskWelcomeMessage?.message} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
          <h2 className="text-lg font-bold text-ink">Live preview</h2>
          <BrandingPreview values={values} contact={{ address: org.address, phone: org.phone, email: org.email }} />
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 shadow-soft">
            <Button type="submit" disabled={!isDirty || isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              Save branding
            </Button>
            <Button type="button" variant="outline" disabled={!isDirty || isSubmitting} onClick={() => reset()}>
              Discard edits
            </Button>
            <FormAlert message={formError} />
            {saved && !isDirty && (
              <p role="status" className="flex items-center gap-1.5 text-sm font-semibold text-success">
                <CircleCheck className="size-4" aria-hidden="true" /> Saved — the dashboard, kiosk and receipts now use these settings.
              </p>
            )}
            <p className="text-xs text-ink-subtle">Address, phone and email are edited under Settings.</p>
          </div>
        </div>
      </form>
    </div>
  );
}
