"use client";

import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus } from "lucide-react";
import type { Classroom } from "@/types/domain";
import type { ChildRecord } from "@/lib/data";
import { DemoBadge } from "@/components/shared/demo-badge";
import { useOrganization } from "@/components/shared/organization-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldError, Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { childFormSchema, type ChildFormValues } from "@/lib/validation/schemas";

const relationships = ["Mother", "Father", "Grandmother", "Grandfather", "Aunt", "Uncle", "Guardian"] as const;

export function AddChildDialog({ classrooms, onCreate }: { classrooms: Classroom[]; onCreate: (child: ChildRecord) => void }) {
  const org = useOrganization();
  const [open, setOpen] = useState(false);
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChildFormValues>({
    resolver: zodResolver(childFormSchema),
    defaultValues: { guardianRelationship: "Mother", firstName: "", lastName: "", dateOfBirth: "", guardianFirstName: "", guardianLastName: "", guardianPhone: "", allergies: "" },
  });

  const onSubmit = (v: ChildFormValues) => {
    // Phase 2: server action → Zod re-validation → insert children/guardians/child_guardians in D1.
    const id = `draft-${crypto.randomUUID()}`;
    const guardianId = `g_${id}`;
    onCreate({
      id,
      organizationId: org.id,
      firstName: v.firstName,
      lastName: v.lastName,
      dateOfBirth: v.dateOfBirth,
      classroomId: v.classroomId,
      enrollmentStatus: "WAITLIST",
      enrolledOn: new Date().toISOString().slice(0, 10),
      allergies: v.allergies ? v.allergies.split(",").map((a) => a.trim()).filter(Boolean) : [],
      guardians: [
        {
          guardian: { id: guardianId, organizationId: org.id, firstName: v.guardianFirstName, lastName: v.guardianLastName, phone: v.guardianPhone },
          link: { id: `cg_${id}`, organizationId: org.id, childId: id, guardianId, relationship: v.guardianRelationship, isPrimary: true, canPickUp: true, isEmergencyContact: true },
        },
      ],
    });
    reset();
    setOpen(false);
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
          <DialogDescription>Create an enrollment record. You can add more guardians and documents afterwards.</DialogDescription>
          <DemoBadge className="mt-2 self-start">Saved for this session only</DemoBadge>
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
              <Label id="classroom-label">Class</Label>
              <Controller
                control={control}
                name="classroomId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
              <Label htmlFor="allergies">Allergies (comma separated, optional)</Label>
              <Input id="allergies" placeholder="e.g. Peanuts, Dairy" {...register("allergies")} />
            </div>
          </fieldset>

          <fieldset className="grid gap-4 sm:grid-cols-2">
            <legend className="mb-3 text-xs font-bold tracking-wide text-ink-subtle uppercase">Primary guardian</legend>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="guardianFirstName">First name</Label>
              <Input id="guardianFirstName" aria-invalid={!!errors.guardianFirstName} {...register("guardianFirstName")} />
              <FieldError message={errors.guardianFirstName?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="guardianLastName">Last name</Label>
              <Input id="guardianLastName" aria-invalid={!!errors.guardianLastName} {...register("guardianLastName")} />
              <FieldError message={errors.guardianLastName?.message} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label id="relationship-label">Relationship</Label>
              <Controller
                control={control}
                name="guardianRelationship"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger aria-labelledby="relationship-label">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {relationships.map((r) => (
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
              <Input id="guardianPhone" type="tel" aria-invalid={!!errors.guardianPhone} {...register("guardianPhone")} />
              <FieldError message={errors.guardianPhone?.message} />
            </div>
          </fieldset>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              Add child
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
