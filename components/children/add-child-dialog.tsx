"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, Plus } from "lucide-react";
import type { Classroom } from "@/types/domain";
import { FormAlert } from "@/components/shared/form-alert";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { applyServerErrors, callAction } from "@/lib/client/server-form";
import { createChildAction } from "@/lib/server/actions";
import { createChildSchema, RELATIONSHIP_VALUES, type CreateChildInput } from "@/lib/validation/mutations";

const FIELDS = [
  "firstName",
  "lastName",
  "dateOfBirth",
  "classroomId",
  "allergyNotes",
  "guardian.firstName",
  "guardian.lastName",
  "guardian.relationship",
  "guardian.phone",
] as const;

const EMPTY: CreateChildInput = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  classroomId: "",
  allergyNotes: "",
  enrollmentStatus: "ACTIVE",
  guardian: { firstName: "", lastName: "", phone: "", relationship: "Mother" },
};

/** Creates the child, primary guardian and link in one atomic server operation, then opens the profile. */
export function AddChildDialog({ classrooms }: { classrooms: Classroom[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string>();
  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CreateChildInput>({ resolver: zodResolver(createChildSchema), defaultValues: EMPTY });

  const onSubmit = async (values: CreateChildInput) => {
    setFormError(undefined);
    const result = await callAction(() => createChildAction(values));
    if (!result.ok) return setFormError(applyServerErrors(result, setError, FIELDS));
    reset(EMPTY);
    setOpen(false);
    router.push(`/children/${result.data.id}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus /> Add Child
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Add a child</DialogTitle>
          <DialogDescription>Create an enrollment record. You can add more guardians and details afterwards.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-5">
          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-xs font-bold tracking-wide text-ink-subtle uppercase">Child</legend>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input id="firstName" aria-invalid={!!errors.firstName} {...register("firstName")} />
              <FieldError message={errors.firstName?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input id="lastName" aria-invalid={!!errors.lastName} {...register("lastName")} />
              <FieldError message={errors.lastName?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dateOfBirth">Date of birth</Label>
              <Input id="dateOfBirth" type="date" aria-invalid={!!errors.dateOfBirth} {...register("dateOfBirth")} />
              <FieldError message={errors.dateOfBirth?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label id="classroom-label">Class (optional)</Label>
              <Controller
                control={control}
                name="classroomId"
                render={({ field }) => (
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <SelectTrigger aria-labelledby="classroom-label" aria-invalid={!!errors.classroomId}>
                      <SelectValue placeholder="Choose a class" />
                    </SelectTrigger>
                    <SelectContent>
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
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="allergyNotes">Allergies (comma separated, optional)</Label>
              <Input id="allergyNotes" placeholder="e.g. Peanuts, Dairy" aria-invalid={!!errors.allergyNotes} {...register("allergyNotes")} />
              <FieldError message={errors.allergyNotes?.message} />
            </div>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-xs font-bold tracking-wide text-ink-subtle uppercase">Primary guardian</legend>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="guardianFirstName">First name</Label>
              <Input id="guardianFirstName" aria-invalid={!!errors.guardian?.firstName} {...register("guardian.firstName")} />
              <FieldError message={errors.guardian?.firstName?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="guardianLastName">Last name</Label>
              <Input id="guardianLastName" aria-invalid={!!errors.guardian?.lastName} {...register("guardian.lastName")} />
              <FieldError message={errors.guardian?.lastName?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label id="relationship-label">Relationship</Label>
              <Controller
                control={control}
                name="guardian.relationship"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-labelledby="relationship-label">
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
                )}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="guardianPhone">Phone</Label>
              <Input id="guardianPhone" type="tel" aria-invalid={!!errors.guardian?.phone} {...register("guardian.phone")} />
              <FieldError message={errors.guardian?.phone?.message} />
            </div>
          </fieldset>

          <FormAlert message={formError} />
          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <LoaderCircle className="animate-spin" aria-hidden="true" />}
              Add child
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
