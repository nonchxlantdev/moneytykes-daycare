/**
 * Builds the SQL that creates ONE real daycare tenant (organization +
 * branding + its first owner). Used for production and for local
 * development of the first tenant:
 *
 *   name "My Daycare", slug "mydaycare", status ACTIVE, timezone America/Belize
 *
 * Idempotent: INSERT OR IGNORE keyed on the unique slug / auth_provider_id,
 * and everything else references the organization BY SLUG, so re-running it
 * never duplicates or overwrites anything (renaming the daycare later in
 * Settings is preserved).
 */
import { randomUUID } from "node:crypto";
import { normalizeHostname } from "../../lib/tenancy/hostname";
import { validateSlug } from "../../lib/tenancy/slug";

export interface TenantInput {
  slug: string;
  name: string;
  timezone: string;
  currency: string;
  owner: { authProviderId: string; email: string; firstName: string; lastName: string };
  now: Date;
}

type SqlValue = string | number | null;
const lit = (v: SqlValue): string => (v === null ? "NULL" : typeof v === "number" ? String(v) : `'${v.replace(/'/g, "''")}'`);

function isTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/** Throws with a clear message when the input is unusable. */
export function validateTenantInput(input: TenantInput): void {
  const slugProblem = validateSlug(input.slug);
  if (slugProblem) throw new Error(`Invalid slug "${input.slug}": ${slugProblem}`);
  if (normalizeHostname(input.slug) !== input.slug) throw new Error("Slugs must be lowercase.");
  if (!input.name.trim() || input.name.length > 80) throw new Error("Name is required (max 80 characters).");
  if (!isTimeZone(input.timezone)) throw new Error(`Unknown timezone "${input.timezone}" (use an IANA name like America/Belize).`);
  if (!/^[A-Z]{3}$/.test(input.currency)) throw new Error(`Currency must be a 3-letter code like BZD.`);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(input.owner.email)) throw new Error("A valid owner email is required.");
  if (!input.owner.authProviderId.includes(":")) throw new Error('Owner auth id looks wrong (expected e.g. "password:usr_bootstrap").');
}

export function buildTenantSql(input: TenantInput): string[] {
  validateTenantInput(input);
  const ts = input.now.getTime();
  const slug = lit(input.slug);
  const org = `(SELECT id FROM organizations WHERE slug = ${slug})`;
  const user = `(SELECT id FROM users WHERE auth_provider_id = ${lit(input.owner.authProviderId)})`;
  const receiptPrefix = lit(input.slug.replace(/-/g, "").slice(0, 4).toUpperCase());
  return [
    `INSERT OR IGNORE INTO organizations (id, name, slug, tagline, status, timezone, currency, expected_arrival_by, created_at, updated_at) ` +
      `VALUES (${lit(randomUUID())}, ${lit(input.name.trim())}, ${slug}, '', 'ACTIVE', ${lit(input.timezone)}, ${lit(input.currency)}, '08:30', ${ts}, ${ts});`,
    `INSERT OR IGNORE INTO organization_branding (id, organization_id, primary_color, secondary_color, accent_color, kiosk_welcome_message, receipt_prefix, created_at, updated_at) ` +
      `SELECT ${lit(randomUUID())}, id, '#2f6bea', '#7c4dff', '#f28c28', 'Welcome!', ${receiptPrefix}, ${ts}, ${ts} FROM organizations WHERE slug = ${slug};`,
    `INSERT OR IGNORE INTO users (id, auth_provider_id, email, first_name, last_name, status, created_at, updated_at) ` +
      `VALUES (${lit(randomUUID())}, ${lit(input.owner.authProviderId)}, ${lit(input.owner.email.toLowerCase())}, ${lit(input.owner.firstName)}, ${lit(input.owner.lastName)}, 'ACTIVE', ${ts}, ${ts});`,
    `INSERT OR IGNORE INTO organization_memberships (id, organization_id, user_id, role, status, created_at, updated_at) ` +
      `SELECT ${lit(randomUUID())}, ${org}, ${user}, 'DAYCARE_OWNER', 'ACTIVE', ${ts}, ${ts} WHERE ${org} IS NOT NULL AND ${user} IS NOT NULL;`,
  ];
}
