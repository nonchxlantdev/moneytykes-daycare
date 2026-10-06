import { index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createdAt, id, utcTimestamp } from "./columns";
import { children, guardians, staff } from "./people";
import { devices, organizations, users } from "./tenancy";

export const ATTENDANCE_EVENT_TYPES = ["CHECK_IN", "CHECK_OUT"] as const;
export const STAFF_TIME_EVENT_TYPES = ["CLOCK_IN", "CLOCK_OUT"] as const;

/**
 * Immutable child attendance events. Current status is DERIVED from the
 * latest event — there is deliberately no `checked_in` column anywhere.
 * `client_event_id` makes submissions idempotent (retries / future
 * offline sync); it is unique per organization.
 */
export const attendanceEvents = sqliteTable(
  "attendance_events",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    childId: text("child_id")
      .notNull()
      .references(() => children.id, { onDelete: "cascade" }),
    guardianId: text("guardian_id").references(() => guardians.id, { onDelete: "set null" }),
    eventType: text("event_type", { enum: ATTENDANCE_EVENT_TYPES }).notNull(),
    eventTime: utcTimestamp("event_time").notNull(),
    deviceId: text("device_id").references(() => devices.id, { onDelete: "set null" }),
    /** Private R2 object key (Phase 3). Never a base64 image. */
    signatureObjectKey: text("signature_object_key"),
    notes: text("notes"),
    createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    clientEventId: text("client_event_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("attendance_events_org_client_event_unique").on(t.organizationId, t.clientEventId),
    index("attendance_events_org_child_time_idx").on(t.organizationId, t.childId, t.eventTime),
    index("attendance_events_org_time_idx").on(t.organizationId, t.eventTime),
  ],
);

export const staffTimeEvents = sqliteTable(
  "staff_time_events",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    staffId: text("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    eventType: text("event_type", { enum: STAFF_TIME_EVENT_TYPES }).notNull(),
    eventTime: utcTimestamp("event_time").notNull(),
    deviceId: text("device_id").references(() => devices.id, { onDelete: "set null" }),
    createdByUserId: text("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    clientEventId: text("client_event_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("staff_time_events_org_client_event_unique").on(t.organizationId, t.clientEventId),
    index("staff_time_events_org_staff_time_idx").on(t.organizationId, t.staffId, t.eventTime),
    index("staff_time_events_org_time_idx").on(t.organizationId, t.eventTime),
  ],
);

/** Meaningful mutations only (never GETs). `metadata_json` must not hold secrets. */
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: id(),
    organizationId: text("organization_id").references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    metadataJson: text("metadata_json"),
    createdAt: createdAt(),
  },
  (t) => [
    index("audit_logs_org_time_idx").on(t.organizationId, t.createdAt),
    index("audit_logs_entity_idx").on(t.organizationId, t.entityType, t.entityId),
  ],
);
