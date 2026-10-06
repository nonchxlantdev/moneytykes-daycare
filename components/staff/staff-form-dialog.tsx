"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, LoaderCircle } from "lucide-react";
import type { Classroom, Staff, StaffEmploymentStatus } from "@/types/domain";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyServerErrors, callAction } from "@/lib/client/server-form";
import { createStaffAction, updateStaffAction } from "@/lib/server/actions";
import { fullName } from "@/lib/utils";
import { createStaffSchema, EMPLOYMENT_STATUS_VALUES, type CreateStaffInput } from "@/lib/validation/mutations";

const FIELDS = [
  "firstName",
  "lastName",
  "jobTitle",
  "email",
  "phone",
  "employeeNumber",
  "classroomId",
  "employmentStatus",
  "statusNote",
  "hireDate",
  "pin",
] as const;
const NO_CLASS = "__none__";

export const EMPLOYMENT_LABEL: Record<StaffEmploymentStatus, string> = {
  ACTIVE: "Active",
  ON_LEAVE: "On leave",
  INACTIVE: "Inactive",
  TERMINATED: "Terminated",
};

function initial(member?: Staff): CreateStaffInput {
  return {
    firstName: member?.firstName ?? "",
    lastName: member?.lastName ?? "",
    jobTitle: member?.jobTitle ?? "",
    email: member?.email ?? "",
    phone: member?.phone ?? "",
    employeeNumber: member?.employeeNumber ?? "",
    classroomId: member?.classroomId ?? "",
    employmentStatus: member?.employmentStatus ?? "ACTIVE",
    statusNote: member?.statusNote ?? "",
    hireDate: member?.hiredOn ?? "",
    pin: "",
  };
}

/** Add a staff member, or edit one (including setting / clearing their time-clock PIN). */
export function StaffFormDialog({ member, classrooms, trigger }: { member?: Staff; classrooms: Classroom[]; trigger: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [clearPin, setClearPin] = useState(false);
  const [formError, setFormError] = useState<string>();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateStaffInput>({ resolver: zodResolver(createStaffSchema), defaultValues: initial(member) });

  const onOpenChange = (next: boolean) => {
    if (next) {
      reset(initial(member));
      setClearPin(false);
    }
    setFormError(undefined);
    setOpen(next);
  };

  const onSubmit = async (values: CreateStaffInput) => {
    setFormError(undefined);
    if (member) {
      const result = await callAction(() => updateStaffAction({ ...values, staffId: member.id, clearPin: clearPin && !values.pin }));
      if (!result.ok) return setFormError(applyServerErrors(result, setError, FIELDS));
      setOpen(false);
      router.refresh();
      return;
    }
    const result = await callAction(() => createStaffAction(values));
    if (!result.ok) return setFormError(applyServerErrors(result, setError, FIELDS));
    setOpen(false);
    router.push(`/staff/${result.data.id}`);
  };

  const status = useWatch({ control, name: "employmentStatus" });
  const id = (name: string) => `sf-${member?.id ?? "new"}-${name}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{member ? `Edit ${fullName(member)}` : "Add a staff member"}</DialogTitle>
          <DialogDescription>
            Staff records are for the time clock and rosters. Dashboard sign-in accounts are managed separately.
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
              <Label htmlFor={id("jobTitle")}>Job title</Label>
              <Input id={id("jobTitle")} placeholder="e.g. Lead Teacher" aria-invalid={!!errors.jobTitle} {...register("jobTitle")} />
              <FieldError message={errors.jobTitle?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label id={id("class-label")}>Class (optional)</Label>
              <Controller
                control={control}
                name="classroomId"
                render={({ field }) => (
                  <Select value={field.value || NO_CLASS} onValueChange={(v) => field.onChange(v === NO_CLASS ? "" : v)}>
                    <SelectTrigger aria-labelledby={id("class-label")} aria-invalid={!!errors.classroomId}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CLASS}>No class</SelectItem>
                      {classrooms.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.classroomId?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("phone")}>Phone (optional)</Label>
              <Input id={id("phone")} type="tel" aria-invalid={!!errors.phone} {...register("phone")} />
              <FieldError message={errors.phone?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("email")}>Email (optional)</Label>
              <Input id={id("email")} type="email" aria-invalid={!!errors.email} {...register("email")} />
              <FieldError message={errors.email?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("employeeNumber")}>Employee # (optional)</Label>
              <Input id={id("employeeNumber")} aria-invalid={!!errors.employeeNumber} {...register("employeeNumber")} />
              <FieldError message={errors.employeeNumber?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("hireDate")}>Hire date (optional)</Label>
              <Input id={id("hireDate")} type="date" aria-invalid={!!errors.hireDate} {...register("hireDate")} />
              <FieldError message={errors.hireDate?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label id={id("status-label")}>Employment status</Label>
              <Controller
                control={control}
                name="employmentStatus"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-labelledby={id("status-label")}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_STATUS_VALUES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {EMPLOYMENT_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor={id("statusNote")}>Status note (optional)</Label>
              <Input
                id={id("statusNote")}
                placeholder={status === "ON_LEAVE" ? "e.g. Sick Leave" : ""}
                aria-invalid={!!errors.statusNote}
                {...register("statusNote")}
              />
              <FieldError message={errors.statusNote?.message} />
            </div>
          </div>

          <fieldset className="flex flex-col gap-2 rounded-xl border border-line p-4">
            <legend className="flex items-center gap-1.5 px-1 text-xs font-bold tracking-wide text-ink-subtle uppercase">
              <KeyRound className="size-3.5" aria-hidden="true" /> Time-clock PIN
            </legend>
            <p className="text-xs text-ink-muted">
              {member?.hasPin ? "A PIN is set. Enter a new one to replace it." : "No PIN set yet."} PINs are stored hashed and can&apos;t be
              viewed afterwards.
            </p>
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor={id("pin")}>{member?.hasPin ? "New PIN" : "PIN"} (4–6 digits)</Label>
                <Input
                  id={id("pin")}
                  type="password"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={6}
                  className="w-36 tracking-[0.3em]"
                  aria-invalid={!!errors.pin}
                  disabled={clearPin}
                  {...register("pin")}
                />
              </div>
              {member?.hasPin && (
                <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm font-medium text-ink">
                  <input type="checkbox" className="size-4" checked={clearPin} onChange={(e) => setClearPin(e.target.checked)} />
                  Remove PIN (disables clocking in)
                </label>
              )}
            </div>
            <FieldError message={errors.pin?.message} />
          </fieldset>

          <FormAlert message={formError} />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              {member ? "Save changes" : "Add staff member"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
