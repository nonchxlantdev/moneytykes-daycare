/**
 * Zod schemas for every database mutation.
 *
 * These run on the SERVER (inside services) for all untrusted input —
 * that is the security boundary. Client forms reuse the same schemas for
 * instant feedback. Optional text fields accept "" from forms; services
 * normalise empty strings to NULL.
 *
 * Note: no schema accepts an organizationId. The tenant is always derived
 * server-side from the authenticated session.
 */
import { z } from "zod";

const uuid = z.uuid({ message: "Invalid identifier" });
const name = (label: string) => z.string().trim().min(1, `${label} is required`).max(60, `${label} is too long`);
const optionalText = (max: number) => z.string().trim().max(max, `Must be ${max} characters or fewer`).optional();
const optionalEmail = z.union([z.literal(""), z.email("Enter a valid email")]).optional();
const phone = z.string().trim().min(7, "Enter a phone number").max(24, "Phone number is too long");
const optionalPhone = z.union([z.literal(""), phone]).optional();
const hexColor = z.string().regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i, "Use a hex color like #2f6bea");

function isRealDate(value: string): boolean {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}
const calendarDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the date picker")
  .refine(isRealDate, "Not a real date");
const optionalCalendarDate = z.union([z.literal(""), calendarDate]).optional();

export const ENROLLMENT_STATUS_VALUES = ["ACTIVE", "INACTIVE", "WAITLIST", "WITHDRAWN"] as const;
export const EMPLOYMENT_STATUS_VALUES = ["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"] as const;
export const RELATIONSHIP_VALUES = [
  "Mother",
  "Father",
  "Grandmother",
  "Grandfather",
  "Aunt",
  "Uncle",
  "Guardian",
  "Family Friend",
  "Nanny",
] as const;

/* ------------------------------- children ------------------------------- */

const childFields = {
  firstName: name("First name"),
  lastName: name("Last name"),
  preferredName: optionalText(60),
  dateOfBirth: calendarDate.refine((v) => v <= new Date().toISOString().slice(0, 10), "Date of birth can't be in the future"),
  classroomId: z.union([z.literal(""), uuid]).optional(),
  enrollmentDate: optionalCalendarDate,
  allergyNotes: optionalText(500),
  medicalNotes: optionalText(2000),
  generalNotes: optionalText(2000),
};

export const createChildSchema = z.object({
  ...childFields,
  enrollmentStatus: z.enum(ENROLLMENT_STATUS_VALUES).default("ACTIVE"),
  /** Optional first guardian, created and linked as primary in the same operation. */
  guardian: z
    .object({
      firstName: name("Guardian first name"),
      lastName: name("Guardian last name"),
      phone,
      email: optionalEmail,
      relationship: z.enum(RELATIONSHIP_VALUES),
    })
    .optional(),
});
export type CreateChildInput = z.input<typeof createChildSchema>;

export const updateChildSchema = z.object({ childId: uuid, ...childFields }).partial().required({ childId: true });
export type UpdateChildInput = z.input<typeof updateChildSchema>;

export const setChildStatusSchema = z.object({ childId: uuid, enrollmentStatus: z.enum(ENROLLMENT_STATUS_VALUES) });
export type SetChildStatusInput = z.input<typeof setChildStatusSchema>;

/* ------------------------------- guardians ------------------------------ */

const guardianFields = {
  firstName: name("First name"),
  lastName: name("Last name"),
  phone,
  email: optionalEmail,
  alternatePhone: optionalPhone,
  address: optionalText(200),
};

const linkFlags = {
  relationship: z.enum(RELATIONSHIP_VALUES),
  isPrimary: z.boolean(),
  authorizedPickup: z.boolean(),
  emergencyContact: z.boolean(),
};

export const createGuardianSchema = z.object({
  ...guardianFields,
  /** Usually created from a child profile, so link immediately. */
  link: z.object({ childId: uuid, ...linkFlags }).optional(),
});
export type CreateGuardianInput = z.input<typeof createGuardianSchema>;

export const updateGuardianSchema = z.object({ guardianId: uuid, ...guardianFields });
export type UpdateGuardianInput = z.input<typeof updateGuardianSchema>;

export const linkGuardianSchema = z.object({ childId: uuid, guardianId: uuid, ...linkFlags });
export type LinkGuardianInput = z.input<typeof linkGuardianSchema>;

export const updateGuardianLinkSchema = z.object({ linkId: uuid, ...linkFlags }).partial().required({ linkId: true });
export type UpdateGuardianLinkInput = z.input<typeof updateGuardianLinkSchema>;

export const unlinkGuardianSchema = z.object({ linkId: uuid });

/* ------------------------------ attendance ------------------------------ */

const attendanceFields = {
  childId: uuid,
  guardianId: uuid.optional(),
  /** Client-generated UUID — makes retries idempotent (and enables offline sync later). */
  clientEventId: uuid,
  notes: optionalText(500),
};

export const checkInChildSchema = z.object(attendanceFields);
export const checkOutChildSchema = z.object({ ...attendanceFields, guardianId: uuid });
export type AttendanceInput = z.input<typeof checkInChildSchema>;

/* --------------------------------- staff -------------------------------- */

const pin = z.string().regex(/^\d{4,6}$/, "PIN must be 4–6 digits");

const staffFields = {
  firstName: name("First name"),
  lastName: name("Last name"),
  jobTitle: z.string().trim().min(1, "Job title is required").max(60),
  email: optionalEmail,
  phone: optionalPhone,
  employeeNumber: optionalText(20),
  classroomId: z.union([z.literal(""), uuid]).optional(),
  employmentStatus: z.enum(EMPLOYMENT_STATUS_VALUES),
  statusNote: optionalText(120),
  hireDate: optionalCalendarDate,
};

export const createStaffSchema = z.object({ ...staffFields, pin: z.union([z.literal(""), pin]).optional() });
export type CreateStaffInput = z.input<typeof createStaffSchema>;

export const updateStaffSchema = z
  .object({ staffId: uuid, ...staffFields, pin: z.union([z.literal(""), pin]).optional(), clearPin: z.boolean().optional() })
  .partial()
  .required({ staffId: true });
export type UpdateStaffInput = z.input<typeof updateStaffSchema>;

export const verifyStaffPinSchema = z.object({ pin });
export const clockInStaffSchema = z.object({ pin, clientEventId: uuid });
export const clockOutStaffSchema = clockInStaffSchema;
export type ClockStaffInput = z.input<typeof clockInStaffSchema>;

/* ------------------------- organization & branding ----------------------- */

function isTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
const KNOWN_CURRENCIES: ReadonlySet<string> | null =
  typeof Intl.supportedValuesOf === "function" ? new Set(Intl.supportedValuesOf("currency")) : null;
function isCurrency(code: string): boolean {
  // Intl.NumberFormat accepts any well-formed code (e.g. "ZZZ"), so check the ISO list when available.
  return /^[A-Z]{3}$/.test(code) && (KNOWN_CURRENCIES ? KNOWN_CURRENCIES.has(code) : true);
}

export const updateOrganizationSchema = z.object({
  legalName: optionalText(120),
  website: optionalText(120),
  timezone: z.string().refine(isTimeZone, "Unknown timezone — use an IANA name like America/Belize"),
  currency: z
    .string()
    .trim()
    .length(3, "Use a 3-letter currency code")
    .transform((c) => c.toUpperCase())
    .refine(isCurrency, "Unknown currency code"),
  expectedArrivalBy: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM"),
  addressLine1: optionalText(120),
  addressLine2: optionalText(120),
  city: optionalText(80),
  stateRegion: optionalText(80),
  postalCode: optionalText(20),
  country: optionalText(80),
  phone: optionalPhone,
  email: optionalEmail,
  receiptBusinessName: optionalText(120),
  receiptTaxId: optionalText(40),
  receiptPrefix: z.string().trim().min(1, "Add a prefix").max(6).regex(/^[A-Za-z0-9-]+$/, "Letters, numbers and dashes only"),
  receiptFooter: optionalText(160),
});
export type UpdateOrganizationInput = z.input<typeof updateOrganizationSchema>;

/** Logo uploads arrive with R2 in Phase 3; for now only same-site paths or https URLs. */
function isLogoUrl(value: string): boolean {
  if (value === "" || /^\/(?!\/)[\w\-./]+$/.test(value)) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
const logoUrl = z
  .string()
  .trim()
  .max(500, "That URL is too long")
  .refine(isLogoUrl, "Use a site path like /tenants/my-daycare/logo.svg or an https:// URL")
  .optional();

export const updateBrandingSchema = z.object({
  name: z.string().trim().min(2, "Daycare name is required").max(80),
  tagline: z.string().trim().max(80),
  logoUrl,
  primaryColor: hexColor,
  secondaryColor: hexColor,
  accentColor: hexColor,
  kioskWelcomeMessage: z.string().trim().min(1, "Add a short greeting").max(120),
});
export type UpdateBrandingInput = z.input<typeof updateBrandingSchema>;
