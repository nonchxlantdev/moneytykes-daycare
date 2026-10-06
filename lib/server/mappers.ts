import type {
  AttendanceEvent,
  Child,
  ChildGuardian,
  Classroom,
  Guardian,
  Organization,
  Staff,
  StaffTimeEvent,
} from "@/types/domain";
import type {
  attendanceEvents,
  childGuardians,
  children,
  classrooms,
  guardians,
  organizationBranding,
  organizations,
  staff,
  staffTimeEvents,
} from "@/lib/db/schema";

/** Row → serialisable view-model mappers. Nothing here should ever expose secrets (PIN hashes etc.). */

type Row<T extends { $inferSelect: unknown }> = T["$inferSelect"];

const opt = (v: string | null | undefined) => (v === null || v === undefined || v === "" ? undefined : v);

export function formatAddress(o: Pick<Row<typeof organizations>, "addressLine1" | "addressLine2" | "city" | "stateRegion" | "postalCode" | "country">): string {
  return [o.addressLine1, o.addressLine2, o.city, o.stateRegion, o.postalCode, o.country].filter((p) => p && p.trim()).join(", ");
}

export function toOrganization(o: Row<typeof organizations>, b: Row<typeof organizationBranding> | undefined): Organization {
  return {
    id: o.id,
    name: o.name,
    legalName: opt(o.legalName),
    slug: o.slug,
    tagline: o.tagline,
    status: o.status,
    timezone: o.timezone,
    currency: o.currency,
    expectedArrivalBy: o.expectedArrivalBy,
    addressLine1: opt(o.addressLine1),
    addressLine2: opt(o.addressLine2),
    city: opt(o.city),
    stateRegion: opt(o.stateRegion),
    postalCode: opt(o.postalCode),
    country: opt(o.country),
    address: formatAddress(o),
    phone: o.phone ?? "",
    email: o.email ?? "",
    website: opt(o.website),
    kioskWelcomeMessage: b?.kioskWelcomeMessage ?? "Welcome!",
    branding: {
      logoUrl: opt(b?.logoUrl),
      primaryColor: b?.primaryColor ?? "#2f6bea",
      secondaryColor: b?.secondaryColor ?? "#7c4dff",
      accentColor: b?.accentColor ?? "#f28c28",
    },
    receipt: {
      businessName: b?.receiptBusinessName || o.legalName || o.name,
      taxId: opt(b?.receiptTaxId),
      receiptPrefix: b?.receiptPrefix ?? "RC",
      footerNote: opt(b?.receiptFooter),
    },
  };
}

export function toClassroom(c: Row<typeof classrooms>): Classroom {
  return { id: c.id, organizationId: c.organizationId, name: c.name, ageRange: c.ageRange ?? "" };
}

export type ChildListRow = Pick<
  Row<typeof children>,
  "id" | "organizationId" | "firstName" | "lastName" | "preferredName" | "dateOfBirth" | "classroomId" | "enrollmentStatus" | "enrollmentDate" | "photoUrl"
> & { hasAllergyAlert: boolean | number };

export function toChildListItem(c: ChildListRow): Child {
  return {
    id: c.id,
    organizationId: c.organizationId,
    firstName: c.firstName,
    lastName: c.lastName,
    preferredName: opt(c.preferredName),
    dateOfBirth: c.dateOfBirth,
    classroomId: opt(c.classroomId),
    enrollmentStatus: c.enrollmentStatus,
    enrolledOn: opt(c.enrollmentDate),
    photoUrl: opt(c.photoUrl),
    hasAllergyAlert: Boolean(c.hasAllergyAlert),
  };
}

export function splitAllergies(notes: string | null | undefined): string[] {
  return (notes ?? "")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Full profile. `includeMedical` is decided by the caller's permissions. */
export function toChildProfile(c: Row<typeof children>, includeMedical: boolean): Child {
  return {
    ...toChildListItem({ ...c, hasAllergyAlert: splitAllergies(c.allergyNotes).length > 0 }),
    allergies: splitAllergies(c.allergyNotes),
    medicalNotes: includeMedical ? opt(c.medicalNotes) : undefined,
    notes: opt(c.generalNotes),
  };
}

export function toGuardian(g: Pick<Row<typeof guardians>, "id" | "organizationId" | "firstName" | "lastName" | "phone"> & Partial<Row<typeof guardians>>): Guardian {
  return {
    id: g.id,
    organizationId: g.organizationId,
    firstName: g.firstName,
    lastName: g.lastName,
    phone: g.phone,
    email: opt(g.email),
    alternatePhone: opt(g.alternatePhone),
    address: opt(g.address),
  };
}

export function toChildGuardian(l: Row<typeof childGuardians>): ChildGuardian {
  return {
    id: l.id,
    organizationId: l.organizationId,
    childId: l.childId,
    guardianId: l.guardianId,
    relationship: l.relationship,
    isPrimary: l.isPrimary,
    canPickUp: l.authorizedPickup,
    isEmergencyContact: l.emergencyContact,
  };
}

export function toStaff(s: Row<typeof staff>): Staff {
  return {
    id: s.id,
    organizationId: s.organizationId,
    userId: opt(s.userId),
    employeeNumber: opt(s.employeeNumber),
    firstName: s.firstName,
    lastName: s.lastName,
    jobTitle: s.jobTitle,
    classroomId: opt(s.classroomId),
    phone: opt(s.phone),
    email: opt(s.email),
    hiredOn: opt(s.hireDate),
    employmentStatus: s.employmentStatus,
    statusNote: opt(s.statusNote),
    hasPin: Boolean(s.pinHash),
  };
}

export function toAttendanceEvent(e: Row<typeof attendanceEvents>): AttendanceEvent {
  return {
    id: e.id,
    organizationId: e.organizationId,
    childId: e.childId,
    guardianId: opt(e.guardianId),
    type: e.eventType,
    eventTime: e.eventTime.toISOString(),
    deviceId: opt(e.deviceId),
    signatureObjectKey: opt(e.signatureObjectKey),
    notes: opt(e.notes),
  };
}

export function toStaffTimeEvent(e: Row<typeof staffTimeEvents>): StaffTimeEvent {
  return {
    id: e.id,
    organizationId: e.organizationId,
    staffId: e.staffId,
    type: e.eventType,
    eventTime: e.eventTime.toISOString(),
    deviceId: opt(e.deviceId),
  };
}

/** "" → null for optional text columns coming from forms. */
export function nullIfEmpty(v: string | undefined | null): string | null {
  if (v === undefined || v === null) return null;
  const t = v.trim();
  return t === "" ? null : t;
}
