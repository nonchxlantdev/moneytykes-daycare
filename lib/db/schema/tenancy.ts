import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createdAt, id, updatedAt, utcTimestamp } from "./columns";

export const ORGANIZATION_STATUSES = ["ACTIVE", "TRIAL", "SUSPENDED", "INACTIVE"] as const;
export const USER_STATUSES = ["ACTIVE", "DISABLED"] as const;
export const MEMBERSHIP_ROLES = ["PLATFORM_ADMIN", "DAYCARE_OWNER", "DAYCARE_ADMIN", "DAYCARE_STAFF"] as const;
export const MEMBERSHIP_STATUSES = ["ACTIVE", "INVITED", "SUSPENDED"] as const;

/** A daycare business (tenant). Vision Forge operates the platform; tenants are data. */
export const organizations = sqliteTable(
  "organizations",
  {
    id: id(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    legalName: text("legal_name"),
    tagline: text("tagline").notNull().default(""),
    status: text("status", { enum: ORGANIZATION_STATUSES }).notNull().default("ACTIVE"),
    timezone: text("timezone").notNull().default("UTC"),
    currency: text("currency").notNull().default("USD"),
    expectedArrivalBy: text("expected_arrival_by").notNull().default("08:30"),
    addressLine1: text("address_line_1"),
    addressLine2: text("address_line_2"),
    city: text("city"),
    stateRegion: text("state_region"),
    postalCode: text("postal_code"),
    country: text("country"),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("organizations_slug_unique").on(t.slug)],
);

/** One-to-one white-label configuration. Logo/favicon object keys arrive with R2 (Phase 3). */
export const organizationBranding = sqliteTable(
  "organization_branding",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    logoUrl: text("logo_url"),
    faviconUrl: text("favicon_url"),
    primaryColor: text("primary_color").notNull().default("#2f6bea"),
    secondaryColor: text("secondary_color").notNull().default("#7c4dff"),
    accentColor: text("accent_color").notNull().default("#f28c28"),
    kioskWelcomeMessage: text("kiosk_welcome_message").notNull().default("Welcome!"),
    receiptBusinessName: text("receipt_business_name"),
    receiptTaxId: text("receipt_tax_id"),
    receiptPrefix: text("receipt_prefix").notNull().default("RC"),
    receiptFooter: text("receipt_footer"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("organization_branding_org_unique").on(t.organizationId)],
);

/**
 * Application users. Authentication itself is handled by the auth layer
 * (lib/auth); this table only maps that external identity
 * (`auth_provider_id`) to an app user. No passwords are stored here.
 */
export const users = sqliteTable(
  "users",
  {
    id: id(),
    authProviderId: text("auth_provider_id").notNull(),
    email: text("email").notNull(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull().default(""),
    status: text("status", { enum: USER_STATUSES }).notNull().default("ACTIVE"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("users_auth_provider_id_unique").on(t.authProviderId), index("users_email_idx").on(t.email)],
);

export const organizationMemberships = sqliteTable(
  "organization_memberships",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: MEMBERSHIP_ROLES }).notNull(),
    status: text("status", { enum: MEMBERSHIP_STATUSES }).notNull().default("ACTIVE"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex("organization_memberships_org_user_unique").on(t.organizationId, t.userId),
    index("organization_memberships_user_idx").on(t.userId),
  ],
);

/** Classrooms are tenant data so each daycare can name its own groups. */
export const classrooms = sqliteTable(
  "classrooms",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    ageRange: text("age_range"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex("classrooms_org_name_unique").on(t.organizationId, t.name)],
);

export const DEVICE_TYPES = ["KIOSK", "ADMIN_TABLET"] as const;
export const DEVICE_STATUSES = ["ACTIVE", "REVOKED"] as const;

/** Registered tablets. Device authentication itself is Phase 3. */
export const devices = sqliteTable(
  "devices",
  {
    id: id(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    deviceType: text("device_type", { enum: DEVICE_TYPES }).notNull(),
    status: text("status", { enum: DEVICE_STATUSES }).notNull().default("ACTIVE"),
    lastSeenAt: utcTimestamp("last_seen_at"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("devices_org_idx").on(t.organizationId)],
);
