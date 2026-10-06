/**
 * Database-ready domain types.
 *
 * These mirror the future Cloudflare D1 schema (via Drizzle). Every
 * tenant-owned record carries `organizationId`, which becomes the
 * `organization_id` column and the tenant boundary for authorization.
 *
 * Timestamps are ISO-8601 strings (UTC offset included).
 */

export type ID = string;
export type ISODateTime = string;
export type ISODate = string; // YYYY-MM-DD

/* ------------------------------------------------------------------ */
/* Organizations / white-label                                         */
/* ------------------------------------------------------------------ */

export interface OrganizationBranding {
  logoUrl?: string; // later: signed URL resolved from an R2 object key
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

export interface Organization {
  id: ID;
  name: string;
  legalName?: string;
  slug: string;
  tagline: string;
  timezone: string;
  currency: string;
  locale: string;
  address: string;
  phone: string;
  email: string;
  website?: string;
  kioskWelcomeMessage: string;
  branding: OrganizationBranding;
  receipt: ReceiptIdentity;
  /** Expected drop-off cut-off, used for "not checked in" alerts. */
  expectedArrivalBy: string; // "HH:mm"
  plan: "starter" | "professional" | "premium";
}

export type OrganizationRole = "OWNER" | "ADMIN" | "STAFF";

export interface User {
  id: ID;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface OrganizationMembership {
  id: ID;
  organizationId: ID;
  userId: ID;
  role: OrganizationRole;
}

/* ------------------------------------------------------------------ */
/* Children & guardians                                                */
/* ------------------------------------------------------------------ */

export type ClassroomId = "infants" | "toddlers" | "preschool" | "pre-k";

export interface Classroom {
  id: ClassroomId;
  organizationId: ID;
  name: string;
  ageRange: string;
}

export type EnrollmentStatus = "ACTIVE" | "WAITLIST" | "WITHDRAWN";

export interface Child {
  id: ID;
  organizationId: ID;
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: ISODate;
  classroomId: ClassroomId;
  enrollmentStatus: EnrollmentStatus;
  enrolledOn: ISODate;
  photoUrl?: string; // later: R2 object key → signed URL
  allergies: string[];
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
  email?: string;
  /** Production: bcrypt/argon2 hash of a kiosk PIN. Never plaintext. */
  pinHash?: string;
}

/** child_guardians join table. */
export interface ChildGuardian {
  id: ID;
  organizationId: ID;
  childId: ID;
  guardianId: ID;
  relationship: GuardianRelationship;
  isPrimary: boolean;
  canPickUp: boolean;
  isEmergencyContact: boolean;
}

/* ------------------------------------------------------------------ */
/* Attendance (event-based — status is DERIVED, never stored)          */
/* ------------------------------------------------------------------ */

export type AttendanceEventType = "CHECK_IN" | "CHECK_OUT";

export interface AttendanceEvent {
  id: ID; // client-generated UUID → idempotent retries / offline sync
  organizationId: ID;
  childId: ID;
  guardianId?: ID;
  type: AttendanceEventType;
  eventTime: ISODateTime;
  deviceId?: ID;
  /** Private R2 object key — never a public URL. */
  signatureObjectKey?: string;
  notes?: string;
}

export type ChildAttendanceStatus = "IN" | "OUT" | "NOT_ARRIVED";

/* ------------------------------------------------------------------ */
/* Staff                                                               */
/* ------------------------------------------------------------------ */

export type StaffEmploymentStatus = "ACTIVE" | "ON_LEAVE" | "INACTIVE";

export interface Staff {
  id: ID;
  organizationId: ID;
  userId?: ID;
  firstName: string;
  lastName: string;
  role: string;
  classroomId?: ClassroomId;
  phone: string;
  email: string;
  hiredOn: ISODate;
  employmentStatus: StaffEmploymentStatus;
  leaveReason?: string;
  photoUrl?: string;
  /** Production: hashed PIN only. */
  pinHash?: string;
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
/* Devices                                                             */
/* ------------------------------------------------------------------ */

export interface Device {
  id: ID;
  organizationId: ID;
  name: string;
  kind: "KIOSK" | "TIME_CLOCK";
  lastSeenAt?: ISODateTime;
}

/* ------------------------------------------------------------------ */
/* Billing                                                             */
/* ------------------------------------------------------------------ */

export type InvoiceStatus = "OPEN" | "PAID" | "OVERDUE" | "VOID";

export interface Invoice {
  id: ID;
  organizationId: ID;
  childId: ID;
  guardianId: ID;
  number: string;
  description: string;
  amount: number; // minor units avoided for readability in mock; use integer cents in DB
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

export interface Receipt {
  id: ID;
  organizationId: ID;
  paymentId: ID;
  number: string;
  issuedAt: ISODateTime;
  objectKey?: string; // R2 PDF
}

/* ------------------------------------------------------------------ */
/* Audit                                                               */
/* ------------------------------------------------------------------ */

export interface AuditLog {
  id: ID;
  organizationId: ID;
  actorUserId?: ID;
  actorDeviceId?: ID;
  action: string;
  entityType: string;
  entityId: ID;
  reason?: string;
  createdAt: ISODateTime;
}

/* ------------------------------------------------------------------ */
/* Documents (child file metadata)                                     */
/* ------------------------------------------------------------------ */

export interface ChildDocument {
  id: ID;
  organizationId: ID;
  childId: ID;
  name: string;
  kind: "ENROLLMENT" | "MEDICAL" | "CONSENT" | "OTHER";
  uploadedAt: ISODateTime;
  objectKey: string;
  expiresOn?: ISODate;
}
