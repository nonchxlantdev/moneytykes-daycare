"use client";

import { useEffect, useRef, useState } from "react";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleCheck, ImageUp, RotateCcw, Sparkles, Trash2 } from "lucide-react";
import { DemoBadge } from "@/components/shared/demo-badge";
import { OrganizationLogo } from "@/components/shared/organization-logo";
import { useOrganizationContext } from "@/components/shared/organization-provider";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsNav } from "@/components/settings/settings-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FieldError, Input, Label } from "@/components/ui/input";
import { readableForeground } from "@/lib/theme/brand-css-vars";
import { brandingFormSchema, type BrandingFormValues } from "@/lib/validation/schemas";
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

export function BrandingSettings() {
  const { organization: org, baseOrganization, applyOrganizationPreview, resetOrganization, isPreviewing } = useOrganizationContext();
  const [applied, setApplied] = useState(false);
  const [logoError, setLogoError] = useState<string>();
  const objectUrl = useRef<string | null>(null);

  const toValues = (o: typeof org): BrandingFormValues => ({
    name: o.name,
    tagline: o.tagline,
    logoUrl: o.branding.logoUrl ?? "",
    primaryColor: o.branding.primaryColor,
    secondaryColor: o.branding.secondaryColor,
    accentColor: o.branding.accentColor,
    address: o.address,
    phone: o.phone,
    email: o.email,
  });

  const {
    register,
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<BrandingFormValues>({ resolver: zodResolver(brandingFormSchema), defaultValues: toValues(org) });
  const values = useWatch({ control }) as BrandingFormValues;

  // Release any local logo preview URL on unmount.
  useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  const onLogo = (file?: File) => {
    if (!file) return;
    if (!/^image\/(png|jpeg|svg\+xml|webp)$/.test(file.type) || file.size > 2 * 1024 * 1024) {
      setLogoError("Please choose a PNG, JPG, SVG or WebP image under 2 MB.");
      return;
    }
    setLogoError(undefined);
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    // Phase 2: upload to R2 (organization-scoped key) and store the object key.
    objectUrl.current = URL.createObjectURL(file);
    setValue("logoUrl", objectUrl.current, { shouldDirty: true });
  };

  const onApply = (v: BrandingFormValues) => {
    applyOrganizationPreview({
      ...org,
      name: v.name,
      tagline: v.tagline,
      address: v.address,
      phone: v.phone,
      email: v.email,
      branding: { ...org.branding, logoUrl: v.logoUrl || undefined, primaryColor: v.primaryColor, secondaryColor: v.secondaryColor, accentColor: v.accentColor },
    });
    reset(v);
    setApplied(true);
  };

  return (
    <div className="mx-auto flex max-w-[1300px] flex-col gap-6 animate-in fade-in-0 duration-500">
      <PageHeader
        title="Branding"
        description="Make the platform feel like your daycare. Every screen, the kiosk and receipts read from these settings."
        actions={<SettingsNav />}
      />

      <form onSubmit={handleSubmit(onApply)} noValidate className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_440px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex-col items-start">
              <CardTitle>Identity</CardTitle>
              <CardDescription>Name, tagline and logo shown in the header, kiosk and receipts.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-5">
              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-dashed border-line-strong p-4">
                <OrganizationLogo name={values.name || "Logo"} logoUrl={values.logoUrl || undefined} size={64} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-ink">Logo</p>
                  <p className="text-xs text-ink-muted">Square PNG, SVG or WebP, at least 256×256. Without a logo we show a monogram.</p>
                  <FieldError message={logoError} />
                </div>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" asChild>
                    <label className="cursor-pointer">
                      <ImageUp /> Upload
                      <input type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="sr-only" onChange={(e) => onLogo(e.target.files?.[0])} />
                    </label>
                  </Button>
                  {values.logoUrl && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setValue("logoUrl", "", { shouldDirty: true })}>
                      <Trash2 /> Remove
                    </Button>
                  )}
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
              <CardTitle>Contact details</CardTitle>
              <CardDescription>Printed on receipts and shown to families.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register("address")} />
                <FieldError message={errors.address?.message} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" type="tel" aria-invalid={!!errors.phone} {...register("phone")} />
                <FieldError message={errors.phone?.message} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" aria-invalid={!!errors.email} {...register("email")} />
                <FieldError message={errors.email?.message} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4 xl:sticky xl:top-24 xl:self-start">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Live preview</h2>
            <DemoBadge>Not persisted</DemoBadge>
          </div>
          <BrandingPreview values={values} />
          <div className="flex flex-col gap-2 rounded-2xl border border-line bg-surface p-4 shadow-soft">
            <Button type="submit" disabled={!isDirty}>
              Apply to this session
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" disabled={!isDirty} onClick={() => reset()}>
                Discard edits
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                disabled={!isPreviewing}
                onClick={() => {
                  resetOrganization();
                  reset(toValues(baseOrganization));
                  setApplied(false);
                }}
              >
                <RotateCcw /> Restore original
              </Button>
            </div>
            {applied && isPreviewing && (
              <p role="status" className="flex items-center gap-1.5 text-sm font-semibold text-success">
                <CircleCheck className="size-4" aria-hidden="true" /> Applied — open the dashboard or kiosk to see it everywhere.
              </p>
            )}
            <p className="text-xs text-ink-subtle">Saving to your organization (and uploading the logo to private storage) arrives with the database phase.</p>
          </div>
        </div>
      </form>
    </div>
  );
}
