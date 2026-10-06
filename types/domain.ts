/**
 * Domain view models used by the UI.
 *
 * The authoritative schema lives in lib/db/schema (Drizzle → Cloudflare D1).
 * Server-side mappers (lib/server/mappers.ts) convert database rows into
 * these serialisable shapes before they cross into client components:
 *   - instants become ISO-8601 UTC strings (formatted in the org timezone by the UI)
 *   - calendar dates stay `YYYY-MM-DD`
 *   - sensitive fields are only present when the viewer is allowed to see them
 */

export type ID = string;
export type ISODateTime = string;
export type ISODate = string; // YYYY-MM-DD

/* ------------------------------------------------------------------ */
/* Organizations / white-label                                         */
/* ------------------------------------------------------------------ */

export interface OrganizationBranding {
  logoUrl?: string; // Phase 3: signed URL resolved from an R2 object key
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  successColor?: string;
  warningColor?: string;
  dangerColor?: string;
}

export interface ReceiptIdentity {
  businessName: string;
  taxId?: string;
  footerNote?: string;
  receiptPrefix: string;
}

export type OrganizationStatus = "ACTIVE" | "TRIAL" | "SUSPENDED" | "INACTIVE";

export interface PostalAddress {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  stateRegion?: string;
  postalCode?: string;
  country?: string;
}

export interface Organization extends PostalAddress {
  id: ID;
  name: string;
  legalName?: string;
  slug: string;
  tagline: string;
  status: OrganizationStatus;
  timezone: string;
  currency: string;
  /** Single-line formatted address for display (derived from the structured fields). */
  address: string;
  phone: string;
  email: string;
  website?: string;
  kioskWelcomeMessage: string;
  branding: OrganizationBranding;
  receipt: ReceiptIdentity;
  /** Expected drop-off cut-off, used for "not checked in" alerts. */
  expectedArrivalBy: string; // "HH:mm"
}

/** Tenant roles (organization_memberships.role). */
export type MembershipRole = "PLATFORM_ADMIN" | "DAYCARE_OWNER" | "DAYCARE_ADMIN" | "DAYCARE_STAFF";

export interface User {
  id: ID;
  name: string;
  email: string;
  avatarUrl?: string;
}

/* ------------------------------------------------------------------ */
/* Children & guardians                                                */
/* ------------------------------------------------------------------ */

export type ClassroomId = string;

export interface Classroom {
  id: ClassroomId;
  organizationId: ID;
  name: string;
  ageRange: string;
}

export type EnrollmentStatus = "ACTIVE" | "INACTIVE" | "WAITLIST" | "WITHDRAWN";

export interface Child {
  id: ID;
  organizationId: ID;
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: ISODate;
  classroomId?: ClassroomId;
  enrollmentStatus: EnrollmentStatus;
  enrolledOn?: ISODate;
  photoUrl?: string; // Phase 3: R2 object key → signed URL
  /** Safe operational flag, included in lists so staff see allergy badges. */
  hasAllergyAlert: boolean;
  /** Profile-only, permission-gated fields (undefined in list views). */
  allergies?: string[];
  medicalNotes?: string;
  notes?: string;
}

export type GuardianRelationship =
  | "Mother"
  | "Father"
  | "Grandmother"
  | "Grandfather"
  | "Aunt"
  | "Uncle"
  | "Guardian"
  | "Family Friend"
  | "Nanny";

export interface Guardian {
  id: ID;
  organizationId: ID;
  firstName: string;
  lastName: string;
  phone: string;
  /** Contact details beyond phone are only included where needed (profile, guardian editor). */
  email?: string;
  alternatePhone?: string;
  address?: string;
}

/** child_guardians join table. */
export interface ChildGuardian {
  id: ID;
  organizationId: ID;
  childId: ID;
  guardianId: ID;
  relationship: string;
  isPrimary: boolean;
  canPickUp: boolean;
  isEmergencyContact: boolean;
}

/** A child with its guardian relationships (list views include name/phone only). */
export interface GuardianLink {
  guardian: Guardian;
  link: ChildGuardian;
}

export interface ChildRecord extends Child {
  guardians: GuardianLink[];
}

/* ------------------------------------------------------------------ */
/* Attendance (event-based — status is DERIVED, never stored)          */
/* ------------------------------------------------------------------ */

export type AttendanceEventType = "CHECK_IN" | "CHECK_OUT";

export interface AttendanceEvent {
  id: ID;
  organizationId: ID;
  childId: ID;
  guardianId?: ID;
  type: AttendanceEventType;
  eventTime: ISODateTime;
  deviceId?: ID;
  /** Private R2 object key (Phase 3) — never a public URL or image data. */
  signatureObjectKey?: string;
  notes?: string;
}

export type ChildAttendanceStatus = "IN" | "OUT" | "NOT_ARRIVED";

/* ------------------------------------------------------------------ */
/* Staff                                                               */
/* ------------------------------------------------------------------ */

export type StaffEmploymentStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED";

export interface Staff {
  id: ID;
  organizationId: ID;
  userId?: ID;
  employeeNumber?: string;
  firstName: string;
  lastName: string;
  jobTitle: string;
  classroomId?: ClassroomId;
  phone?: string;
  email?: string;
  hiredOn?: ISODate;
  employmentStatus: StaffEmploymentStatus;
  /** e.g. "Sick Leave". */
  statusNote?: string;
  photoUrl?: string;
  /** Whether a time-clock PIN is configured. The hash itself never leaves the server. */
  hasPin: boolean;
}

export type StaffTimeEventType = "CLOCK_IN" | "CLOCK_OUT";

export interface StaffTimeEvent {
  id: ID;
  organizationId: ID;
  staffId: ID;
  type: StaffTimeEventType;
  eventTime: ISODateTime;
  deviceId?: ID;
}

export type StaffDutyStatus = "ON_DUTY" | "OFF_DUTY" | "ON_LEAVE";

/* ------------------------------------------------------------------ */
/* Billing (still mock data in Phase 2 — see README)                   */
/* ------------------------------------------------------------------ */

export type InvoiceStatus = "OPEN" | "PAID" | "OVERDUE" | "VOID";

export interface Invoice {
  id: ID;
  organizationId: ID;
  childId: ID;
  guardianId: ID;
  number: string;
  description: string;
  amount: number;
  issuedOn: ISODate;
  dueOn: ISODate;
  status: InvoiceStatus;
}

export type PaymentMethod = "CASH" | "BANK_TRANSFER" | "CARD" | "OTHER";

export interface Payment {
  id: ID;
  organizationId: ID;
  childId: ID;
  guardianId: ID;
  invoiceId?: ID;
  amount: number;
  method: PaymentMethod;
  reference?: string;
  receivedAt: ISODateTime;
  recordedByUserId: ID;
  receiptNumber: string;
}
