import { sql } from "drizzle-orm";
import type { AppDb } from "../client";
import { auditLogs } from "../schema";

export interface AuditEntry {
  organizationId: string | null;
  userId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  /** Field NAMES and non-sensitive context only — never medical notes, PINs or tokens. */
  metadata?: Record<string, unknown>;
}

/** Audit insert as a builder so callers can include it in an atomic batch with the mutation. */
export function auditInsert(db: AppDb, entry: AuditEntry) {
  return db.insert(auditLogs).values({
    organizationId: entry.organizationId,
    userId: entry.userId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    metadataJson: entry.metadata ? JSON.stringify(entry.metadata) : null,
  });
}

/** Audit row that is only written if `existsSql` matches — pairs with conditional event inserts in one batch. */
export function auditInsertIfEventExists(db: AppDb, entry: AuditEntry, eventTable: "attendance_events" | "staff_time_events") {
  const id = crypto.randomUUID();
  const now = Date.now();
  const metadata = entry.metadata ? JSON.stringify(entry.metadata) : null;
  return db.run(sql`
    INSERT INTO audit_logs (id, organization_id, user_id, action, entity_type, entity_id, metadata_json, created_at)
    SELECT ${id}, ${entry.organizationId}, ${entry.userId}, ${entry.action}, ${entry.entityType}, ${entry.entityId}, ${metadata}, ${now}
    WHERE EXISTS (SELECT 1 FROM ${sql.raw(eventTable)} WHERE id = ${entry.entityId})
  `);
}

export async function listAuditForEntity(db: AppDb, organizationId: string, entityType: string, entityId: string) {
  return db.query.auditLogs.findMany({
    where: (a, { and, eq }) => and(eq(a.organizationId, organizationId), eq(a.entityType, entityType), eq(a.entityId, entityId)),
    orderBy: (a, { desc }) => desc(a.createdAt),
  });
}
