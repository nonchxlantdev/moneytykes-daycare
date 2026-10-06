import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { calendarDate, createdAt, id, updatedAt } from "./columns";
import { classrooms, organizations, users } from "./tenancy";

export const ENROLLMENT_STATUSES = ["ACTIVE", "INACTIVE", "WAITLIST", "WITHDRAWN"] as const;
export const EMPLOYMENT_STATUSES = ["ACTIVE", "INACTIVE", "ON_LEAVE", "TERMINATED"] as const;
export const GUARDIAN_RELATIONSHIPS = [
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

export const children = sqliteTable(
  "children",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    preferredName: text("preferred_name"),
    dateOfBirth: calendarDate("date_of_birth").notNull(),
    classroomId: text("classroom_id").references(() => classrooms.id, { onDelete: "set null" }),
    enrollmentStatus: text("enrollment_status", { enum: ENROLLMENT_STATUSES }).notNull().default("ACTIVE"),
    enrollmentDate: calendarDate("enrollment_date"),
    photoUrl: text("photo_url"),
    // Sensitive — only selected on the child profile, never in list queries.
    medicalNotes: text("medical_notes"),
    allergyNotes: text("allergy_notes"),
    generalNotes: text("general_notes"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("children_org_status_idx").on(t.organizationId, t.enrollmentStatus),
    index("children_org_name_idx").on(t.organizationId, t.lastName, t.firstName),
  ],
);

export const guardians = sqliteTable(
  "guardians",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone").notNull(),
    alternatePhone: text("alternate_phone"),
    address: text("address"),
    /** Reserved for real guardian kiosk PINs (hashed). Unused in Phase 2. */
    pinHash: text("pin_hash"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("guardians_org_name_idx").on(t.organizationId, t.lastName, t.firstName),
    index("guardians_org_email_idx").on(t.organizationId, t.email),
  ],
);

/** Many-to-many child ↔ guardian with per-relationship permissions. */
export const childGuardians = sqliteTable(
  "child_guardians",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    guardianId: text("guardian_id")
      .notNull()
      .references(() => guardians.id, { onDelete: "cascade" }),
    relationship: text("relationship").notNull(),
    isPrimary: integer("is_primary", { mode: "boolean" }).notNull().default(false),
    authorizedPickup: integer("authorized_pickup", { mode: "boolean" }).notNull().default(true),
    emergencyContact: integer("emergency_contact", { mode: "boolean" }).notNull().default(false),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("child_guardians_child_guardian_unique").on(t.childId, t.guardianId),
    index("child_guardians_org_child_idx").on(t.organizationId, t.childId),
    index("child_guardians_org_guardian_idx").on(t.organizationId, t.guardianId),
  ],
);

export const staff = sqliteTable(
  "staff",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    employeeNumber: text("employee_number"),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    email: text("email"),
    phone: text("phone"),
    jobTitle: text("job_title").notNull(),
    classroomId: text("classroom_id").references(() => classrooms.id, { onDelete: "set null" }),
    employmentStatus: text("employment_status", { enum: EMPLOYMENT_STATUSES }).notNull().default("ACTIVE"),
    statusNote: text("status_note"),
    /** bcrypt hash of the time-clock PIN. Plaintext PINs are never stored. */
    pinHash: text("pin_hash"),
    hireDate: calendarDate("hire_date"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("staff_org_status_idx").on(t.organizationId, t.employmentStatus),
    index("staff_org_email_idx").on(t.organizationId, t.email),
    uniqueIndex("staff_org_employee_number_unique").on(t.organizationId, t.employeeNumber),
  ],
);
