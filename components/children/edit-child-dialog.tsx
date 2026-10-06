"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Pencil } from "lucide-react";
import type { ChildRecord, Classroom } from "@/types/domain";
import { FormAlert } from "@/components/shared/form-alert";
import { useCan } from "@/components/shared/viewer-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldError, Input, Label, Textarea } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyServerErrors, callAction } from "@/lib/client/server-form";
import { updateChildAction } from "@/lib/server/actions";
import { updateChildSchema, type UpdateChildInput } from "@/lib/validation/mutations";

const FIELDS = ["firstName", "lastName", "preferredName", "dateOfBirth", "classroomId", "enrollmentDate", "allergyNotes", "medicalNotes"] as const;
const NO_CLASS = "__none__";

function defaults(child: ChildRecord): UpdateChildInput {
  return {
    childId: child.id,
    firstName: child.firstName,
    lastName: child.lastName,
    preferredName: child.preferredName ?? "",
    dateOfBirth: child.dateOfBirth,
    classroomId: child.classroomId ?? "",
    enrollmentDate: child.enrolledOn ?? "",
    allergyNotes: (child.allergies ?? []).join(", "),
    medicalNotes: child.medicalNotes ?? "",
  };
}

export function EditChildDialog({ child, classrooms }: { child: ChildRecord; classrooms: Classroom[] }) {
  const router = useRouter();
  const canMedical = useCan("children:read-medical");
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string>();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<UpdateChildInput>({ resolver: zodResolver(updateChildSchema), defaultValues: defaults(child) });

  const onOpenChange = (next: boolean) => {
    if (next) reset(defaults(child));
    setFormError(undefined);
    setOpen(next);
  };

  const onSubmit = async (values: UpdateChildInput) => {
    setFormError(undefined);
    // Medical notes are only sent by users allowed to see them (the server enforces this too).
    const input = canMedical ? values : { ...values, medicalNotes: undefined };
    const result = await callAction(() => updateChildAction(input));
    if (!result.ok) return setFormError(applyServerErrors(result, setError, FIELDS));
    setOpen(false);
    router.refresh();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Pencil /> Edit details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit child details</DialogTitle>
          <DialogDescription>Changes are saved immediately and recorded in the audit log.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ec-firstName">First name</Label>
              <Input id="ec-firstName" aria-invalid={!!errors.firstName} {...register("firstName")} />
              <FieldError message={errors.firstName?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ec-lastName">Last name</Label>
              <Input id="ec-lastName" aria-invalid={!!errors.lastName} {...register("lastName")} />
              <FieldError message={errors.lastName?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ec-preferredName">Preferred name (optional)</Label>
              <Input id="ec-preferredName" aria-invalid={!!errors.preferredName} {...register("preferredName")} />
              <FieldError message={errors.preferredName?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ec-dateOfBirth">Date of birth</Label>
              <Input id="ec-dateOfBirth" type="date" aria-invalid={!!errors.dateOfBirth} {...register("dateOfBirth")} />
              <FieldError message={errors.dateOfBirth?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label id="ec-classroom-label">Class</Label>
              <Controller
                control={control}
                name="classroomId"
                render={({ field }) => (
                  <Select value={field.value || NO_CLASS} onValueChange={(v) => field.onChange(v === NO_CLASS ? "" : v)}>
                    <SelectTrigger aria-labelledby="ec-classroom-label" aria-invalid={!!errors.classroomId}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_CLASS}>No class assigned</SelectItem>
                      {classrooms.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} · {c.ageRange}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              <FieldError message={errors.classroomId?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ec-enrollmentDate">Enrolled since</Label>
              <Input id="ec-enrollmentDate" type="date" aria-invalid={!!errors.enrollmentDate} {...register("enrollmentDate")} />
              <FieldError message={errors.enrollmentDate?.message} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="ec-allergyNotes">Allergies (comma separated)</Label>
              <Input id="ec-allergyNotes" placeholder="e.g. Peanuts, Dairy" aria-invalid={!!errors.allergyNotes} {...register("allergyNotes")} />
              <FieldError message={errors.allergyNotes?.message} />
            </div>
            {canMedical && (
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <Label htmlFor="ec-medicalNotes">Medical notes</Label>
                <Textarea id="ec-medicalNotes" rows={3} aria-invalid={!!errors.medicalNotes} {...register("medicalNotes")} />
                <FieldError message={errors.medicalNotes?.message} />
              </div>
            )}
          </div>
          <FormAlert message={formError} />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              Save changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
