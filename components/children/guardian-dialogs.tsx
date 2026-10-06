"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Search } from "lucide-react";
import type { GuardianLink } from "@/types/domain";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyServerErrors, callAction } from "@/lib/client/server-form";
import {
  createGuardianAction,
  linkGuardianAction,
  searchGuardiansAction,
  unlinkGuardianAction,
  updateGuardianAction,
} from "@/lib/server/actions";
import { fullName } from "@/lib/utils";
import { createGuardianSchema, RELATIONSHIP_VALUES, type CreateGuardianInput } from "@/lib/validation/mutations";

type Relationship = (typeof RELATIONSHIP_VALUES)[number];

const DETAIL_FIELDS = ["firstName", "lastName", "phone", "email", "alternatePhone", "address", "link.relationship"] as const;

function Checkbox({ id, label, ...props }: { id: string; label: string } & React.ComponentProps<"input">) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm font-medium text-ink">
      <input id={id} type="checkbox" className="size-4 rounded border-line accent-[var(--brand-primary)]" {...props} />
      {label}
    </label>
  );
}

function RelationshipSelect({ value, onChange, labelId }: { value: string; onChange: (v: Relationship) => void; labelId: string }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as Relationship)}>
      <SelectTrigger aria-labelledby={labelId}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {RELATIONSHIP_VALUES.map((r) => (
          <SelectItem key={r} value={r}>
            {r}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Create a guardian (and link them to the child) or edit an existing guardian's contact details.
 * Contact details belong to the guardian record and are shared by every child they're linked to.
 */
export function GuardianFormDialog({
  childId,
  existing,
  trigger,
}: {
  childId: string;
  existing?: GuardianLink;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const isEdit = Boolean(existing);
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string>();

  const initial = (): CreateGuardianInput =>
    existing
      ? {
          firstName: existing.guardian.firstName,
          lastName: existing.guardian.lastName,
          phone: existing.guardian.phone,
          email: existing.guardian.email ?? "",
          alternatePhone: existing.guardian.alternatePhone ?? "",
          address: existing.guardian.address ?? "",
        }
      : {
          firstName: "",
          lastName: "",
          phone: "",
          email: "",
          alternatePhone: "",
          address: "",
          link: { childId, relationship: "Guardian", isPrimary: false, authorizedPickup: true, emergencyContact: false },
        };

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateGuardianInput>({ resolver: zodResolver(createGuardianSchema), defaultValues: initial() });

  const onOpenChange = (next: boolean) => {
    if (next) reset(initial());
    setFormError(undefined);
    setOpen(next);
  };

  const onSubmit = async (values: CreateGuardianInput) => {
    setFormError(undefined);
    const result = existing
      ? await callAction(() =>
          updateGuardianAction({
            guardianId: existing.guardian.id,
            firstName: values.firstName,
            lastName: values.lastName,
            phone: values.phone,
            email: values.email,
            alternatePhone: values.alternatePhone,
            address: values.address,
          }),
        )
      : await callAction(() => createGuardianAction(values));
    if (!result.ok) return setFormError(applyServerErrors(result, setError, DETAIL_FIELDS));
    setOpen(false);
    router.refresh();
  };

  const id = (name: string) => `gf-${existing?.link.id ?? "new"}-${name}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEdit ? `Edit ${fullName(existing!.guardian)}` : "Add a new guardian"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Contact details are shared by every child this guardian is linked to."
              : "Creates the guardian and links them to this child."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("firstName")}>First name</Label>
              <Input id={id("firstName")} aria-invalid={!!errors.firstName} {...register("firstName")} />
              <FieldError message={errors.firstName?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("lastName")}>Last name</Label>
              <Input id={id("lastName")} aria-invalid={!!errors.lastName} {...register("lastName")} />
              <FieldError message={errors.lastName?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("phone")}>Phone</Label>
              <Input id={id("phone")} type="tel" aria-invalid={!!errors.phone} {...register("phone")} />
              <FieldError message={errors.phone?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("alternatePhone")}>Alternate phone (optional)</Label>
              <Input id={id("alternatePhone")} type="tel" aria-invalid={!!errors.alternatePhone} {...register("alternatePhone")} />
              <FieldError message={errors.alternatePhone?.message} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor={id("email")}>Email (optional)</Label>
              <Input id={id("email")} type="email" aria-invalid={!!errors.email} {...register("email")} />
              <FieldError message={errors.email?.message} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor={id("address")}>Address (optional)</Label>
              <Input id={id("address")} aria-invalid={!!errors.address} {...register("address")} />
              <FieldError message={errors.address?.message} />
            </div>
          </div>

          {!isEdit && (
            <fieldset className="flex flex-col gap-3 rounded-xl border border-line p-4">
              <legend className="px-1 text-xs font-bold tracking-wide text-ink-subtle uppercase">Relationship to child</legend>
              <div className="flex flex-col gap-1.5 sm:max-w-60">
                <Label id={id("rel-label")}>Relationship</Label>
                <Controller
                  control={control}
                  name="link.relationship"
                  render={({ field }) => <RelationshipSelect value={field.value ?? "Guardian"} onChange={field.onChange} labelId={id("rel-label")} />}
                />
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Checkbox id={id("primary")} label="Primary guardian" {...register("link.isPrimary")} />
                <Checkbox id={id("pickup")} label="Authorized pickup" {...register("link.authorizedPickup")} />
                <Checkbox id={id("emergency")} label="Emergency contact" {...register("link.emergencyContact")} />
              </div>
            </fieldset>
          )}

          <FormAlert message={formError} />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              {isEdit ? "Save changes" : "Add guardian"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type SearchHit = { id: string; firstName: string; lastName: string; phone: string };

/** Link a guardian who already exists in this organization (e.g. a sibling's parent). */
export function LinkGuardianDialog({ childId, linkedIds, trigger }: { childId: string; linkedIds: string[]; trigger: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchHit>();
  const [relationship, setRelationship] = useState<Relationship>("Guardian");
  const [flags, setFlags] = useState({ isPrimary: false, authorizedPickup: true, emergencyContact: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!open || query.trim().length < 2) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      const result = await callAction(() => searchGuardiansAction(query));
      if (cancelled) return;
      setSearching(false);
      if (result.ok) setHits(result.data.filter((h) => !linkedIds.includes(h.id)));
      else setError(result.error.message);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, linkedIds]);

  const onOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setQuery("");
      setHits([]);
      setSelected(undefined);
      setError(undefined);
    }
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true);
    setError(undefined);
    const result = await callAction(() => linkGuardianAction({ childId, guardianId: selected.id, relationship, ...flags }));
    setSaving(false);
    if (!result.ok) return setError(result.error.message);
    onOpenChange(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Link an existing guardian</DialogTitle>
          <DialogDescription>Search guardians already on file, for example a sibling&apos;s parent.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-subtle" aria-hidden="true" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSelected(undefined);
                if (e.target.value.trim().length < 2) setHits([]);
              }}
              placeholder="Name or phone (2+ characters)"
              aria-label="Search guardians"
              className="pl-9"
            />
          </div>
          <ul className="max-h-56 overflow-y-auto rounded-xl border border-line" aria-label="Search results" aria-busy={searching}>
            {query.trim().length < 2 ? (
              <li className="p-3 text-sm text-ink-muted">Start typing to search.</li>
            ) : searching && hits.length === 0 ? (
              <li className="flex items-center gap-2 p-3 text-sm text-ink-muted">
                <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> Searching…
              </li>
            ) : hits.length === 0 ? (
              <li className="p-3 text-sm text-ink-muted">No matching guardians who aren&apos;t already linked.</li>
            ) : (
              hits.map((h) => (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(h)}
                    aria-pressed={selected?.id === h.id}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted ${selected?.id === h.id ? "bg-primary/10" : ""}`}
                  >
                    <span className="font-semibold text-ink">{fullName(h)}</span>
                    <span className="text-ink-muted tabular">{h.phone}</span>
                  </button>
                </li>
              ))
            )}
          </ul>
          {selected && (
            <div className="flex flex-col gap-3 rounded-xl border border-line p-4">
              <div className="flex flex-col gap-1.5 sm:max-w-60">
                <Label id="link-rel-label">Relationship to child</Label>
                <RelationshipSelect value={relationship} onChange={setRelationship} labelId="link-rel-label" />
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <Checkbox id="link-primary" label="Primary guardian" checked={flags.isPrimary} onChange={(e) => setFlags((f) => ({ ...f, isPrimary: e.target.checked }))} />
                <Checkbox id="link-pickup" label="Authorized pickup" checked={flags.authorizedPickup} onChange={(e) => setFlags((f) => ({ ...f, authorizedPickup: e.target.checked }))} />
                <Checkbox id="link-emergency" label="Emergency contact" checked={flags.emergencyContact} onChange={(e) => setFlags((f) => ({ ...f, emergencyContact: e.target.checked }))} />
              </div>
            </div>
          )}
          <FormAlert message={error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" disabled={!selected || saving} onClick={save}>
              {saving && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              Link guardian
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Removes the relationship only — the guardian record stays (they may be linked to other children). */
export function UnlinkGuardianDialog({ gl, childName, trigger }: { gl: GuardianLink; childName: string; trigger: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const confirm = async () => {
    setBusy(true);
    setError(undefined);
    const result = await callAction(() => unlinkGuardianAction({ linkId: gl.link.id }));
    setBusy(false);
    if (!result.ok) return setError(result.error.message);
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { setOpen(next); setError(undefined); }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remove {fullName(gl.guardian)}?</DialogTitle>
          <DialogDescription>
            They will no longer be listed for {childName} and can&apos;t sign them out. Their guardian record is kept.
          </DialogDescription>
        </DialogHeader>
        <FormAlert message={error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={busy} onClick={confirm}>
            {busy && <LoaderCircle className="animate-spin" aria-hidden="true" />}
            Remove from child
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
