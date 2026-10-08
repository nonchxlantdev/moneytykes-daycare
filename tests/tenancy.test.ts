import { beforeEach, describe, expect, it } from "vitest";
import { buildTenantSql } from "../scripts/tenants/build-tenant";
import type { AppDb } from "@/lib/db/client";
import { listChildRecords } from "@/lib/server/services/children";
import { getPublicTenantBySlug } from "@/lib/server/services/public-tenant";
import { getOrganization } from "@/lib/server/services/organization";
import { NoMembershipError, TenantNotFoundError, listUsableMemberships, resolveTenantContext } from "@/lib/server/tenant-context";
import { cookieDomainFor, platformUrl, resolveTenantFromHostname, tenantUrl } from "@/lib/tenancy/hostname";
import { normalizeSlug, RESERVED_SUBDOMAINS, validateSlug } from "@/lib/tenancy/slug";
import { createOrg } from "./helpers/fixtures";
import { createTestDatabase } from "./helpers/sqlite-executor";

const ROOT = "visionforgestudio.app";

describe("hostname resolution", () => {
  it("treats the root domain as the platform, never a daycare", () => {
    expect(resolveTenantFromHostname("visionforgestudio.app", ROOT)).toEqual({ kind: "platform", rootDomain: ROOT });
    expect(resolveTenantFromHostname("VisionForgeStudio.App.", ROOT)).toEqual({ kind: "platform", rootDomain: ROOT });
  });

  it("maps mydaycare.visionforgestudio.app to the mydaycare slug", () => {
    expect(resolveTenantFromHostname("mydaycare.visionforgestudio.app", ROOT)).toEqual({ kind: "tenant", slug: "mydaycare", rootDomain: ROOT });
    expect(resolveTenantFromHostname("MyDaycare.visionforgestudio.app:443", ROOT)).toMatchObject({ kind: "tenant", slug: "mydaycare" });
  });

  it("returns a tenant slug for unknown daycares (existence is checked against the database later)", () => {
    expect(resolveTenantFromHostname("fakecompany.visionforgestudio.app", ROOT)).toMatchObject({ kind: "tenant", slug: "fakecompany" });
  });

  it("flags reserved and malformed subdomains", () => {
    for (const sub of ["www", "app", "api", "admin", "support", "help", "status", "mail", "cdn", "assets", "static", "auth"]) {
      expect(resolveTenantFromHostname(`${sub}.visionforgestudio.app`, ROOT)).toEqual({ kind: "reserved", subdomain: sub, rootDomain: ROOT });
    }
    expect(resolveTenantFromHostname("a.b.visionforgestudio.app", ROOT).kind).toBe("invalid");
    expect(resolveTenantFromHostname("-bad.visionforgestudio.app", ROOT).kind).toBe("invalid");
    expect(resolveTenantFromHostname("x.visionforgestudio.app", ROOT).kind).toBe("invalid"); // too short
  });

  it("does not treat look-alike domains as the platform", () => {
    expect(resolveTenantFromHostname("evilvisionforgestudio.app", ROOT).kind).toBe("unscoped");
    expect(resolveTenantFromHostname("mydaycare.visionforgestudio.app.evil.com", ROOT).kind).toBe("unscoped");
  });

  it("supports *.localhost for local development", () => {
    expect(resolveTenantFromHostname("mydaycare.localhost:3001", ROOT)).toEqual({ kind: "tenant", slug: "mydaycare", rootDomain: "localhost" });
    expect(resolveTenantFromHostname("localhost:3001", ROOT)).toEqual({ kind: "platform", rootDomain: "localhost" });
  });

  it("leaves pre-cutover test hosts unscoped", () => {
    expect(resolveTenantFromHostname("vision-forge-daycare.example.workers.dev", ROOT).kind).toBe("unscoped");
    expect(resolveTenantFromHostname("daycare-project.vercel.app", ROOT).kind).toBe("unscoped");
    expect(resolveTenantFromHostname("", ROOT).kind).toBe("unscoped");
    expect(resolveTenantFromHostname("[::1]:3000", ROOT).kind).toBe("unscoped");
  });

  it("builds tenant and platform URLs that keep scheme and port", () => {
    expect(tenantUrl("mydaycare", "/dashboard", { host: "visionforgestudio.app", protocol: "https", rootDomain: ROOT })).toBe(
      "https://mydaycare.visionforgestudio.app/dashboard",
    );
    expect(tenantUrl("mydaycare", "//evil.com", { host: "localhost:3001", protocol: "http", rootDomain: "localhost" })).toBe("http://mydaycare.localhost:3001/");
    expect(platformUrl("/login", { host: "www.visionforgestudio.app", protocol: "https", rootDomain: ROOT })).toBe("https://visionforgestudio.app/login");
  });

  it("shares the session cookie only within the platform domain", () => {
    expect(cookieDomainFor("visionforgestudio.app", ROOT)).toBe(ROOT);
    expect(cookieDomainFor("mydaycare.visionforgestudio.app", ROOT)).toBe(ROOT);
    expect(cookieDomainFor("vision-forge-daycare.example.workers.dev", ROOT)).toBeUndefined();
    expect(cookieDomainFor("mydaycare.localhost:3001", ROOT)).toBeUndefined();
    expect(cookieDomainFor("mydaycare.visionforgestudio.app", undefined)).toBeUndefined();
  });
});

describe("slug validation", () => {
  it("accepts DNS-safe lowercase slugs", () => {
    for (const slug of ["mydaycare", "little-stars", "happy-kids-2", "abc"]) expect(validateSlug(slug)).toBeNull();
  });

  it("rejects unsafe or reserved slugs", () => {
    for (const slug of ["My Daycare", "my_daycare", "MyDaycare", "-start", "end-", "a--b", "ab", "x".repeat(64), "café", "www", "api", "admin"]) {
      expect(validateSlug(slug)).not.toBeNull();
    }
    for (const reserved of ["www", "app", "api", "admin", "support", "help", "status", "mail", "cdn", "assets", "static", "auth"]) {
      expect(RESERVED_SUBDOMAINS.has(reserved)).toBe(true);
    }
  });

  it("normalizes free text into a candidate slug", () => {
    expect(normalizeSlug("  Sunshine Day Care! ")).toBe("sunshine-day-care");
    expect(normalizeSlug("Crèche_Étoile")).toBe("creche-etoile");
  });
});

describe("tenant resolution against the database", () => {
  let db: AppDb;
  let sqlite: ReturnType<typeof createTestDatabase>["sqlite"];
  const owner = { authProviderId: "password:usr_bootstrap", email: "owner@example.test", firstName: "Glen", lastName: "Owner" };

  beforeEach(() => {
    ({ db, sqlite } = createTestDatabase());
    for (const s of buildTenantSql({ slug: "mydaycare", name: "My Daycare", timezone: "America/Belize", currency: "BZD", owner, now: new Date() })) sqlite.exec(s);
  });

  it("creates the first tenant idempotently", async () => {
    for (const s of buildTenantSql({ slug: "mydaycare", name: "Renamed?", timezone: "America/Belize", currency: "BZD", owner, now: new Date() })) sqlite.exec(s);
    const counts = sqlite.prepare("SELECT (SELECT COUNT(*) FROM organizations) o, (SELECT COUNT(*) FROM organization_branding) b, (SELECT COUNT(*) FROM users) u, (SELECT COUNT(*) FROM organization_memberships) m").get();
    expect(counts).toEqual({ o: 1, b: 1, u: 1, m: 1 });
    const ctx = await resolveTenantContext(db, owner.authProviderId, { slug: "mydaycare" });
    const org = await getOrganization(db, ctx);
    expect(org).toMatchObject({ name: "My Daycare", slug: "mydaycare", status: "ACTIVE", timezone: "America/Belize" });
    expect(ctx.role).toBe("DAYCARE_OWNER");
  });

  it("rejects reserved slugs when creating a tenant", () => {
    expect(() => buildTenantSql({ slug: "admin", name: "x", timezone: "America/Belize", currency: "BZD", owner, now: new Date() })).toThrow(/reserved/);
  });

  it("resolves mydaycare to the correct organization and its data only", async () => {
    const other = await createOrg(db, "Other Daycare", "9999");
    const ctx = await resolveTenantContext(db, owner.authProviderId, { slug: "mydaycare" });
    expect(ctx.organizationId).not.toBe(other.orgId);
    expect(await listChildRecords(db, ctx)).toEqual([]);
  });

  it("returns 'not found' for unknown daycares instead of falling back to another one", async () => {
    await expect(resolveTenantContext(db, owner.authProviderId, { slug: "fakecompany" })).rejects.toBeInstanceOf(TenantNotFoundError);
    expect(await getPublicTenantBySlug(db, "fakecompany")).toBeNull();
    expect(await getPublicTenantBySlug(db, "mydaycare")).toMatchObject({ name: "My Daycare" });
  });

  it("rejects a signed-in user who is not a member of the requested daycare (cross-tenant)", async () => {
    const other = await createOrg(db, "Other Daycare", "9999");
    sqlite.exec(`UPDATE organizations SET slug = 'otherdaycare' WHERE id = '${other.orgId}'`);
    await expect(resolveTenantContext(db, owner.authProviderId, { slug: "otherdaycare" })).rejects.toBeInstanceOf(NoMembershipError);
  });

  it("treats suspended daycares as not found", async () => {
    sqlite.exec(`UPDATE organizations SET status = 'SUSPENDED' WHERE slug = 'mydaycare'`);
    await expect(resolveTenantContext(db, owner.authProviderId, { slug: "mydaycare" })).rejects.toBeInstanceOf(TenantNotFoundError);
    expect(await listUsableMemberships(db, owner.authProviderId)).toEqual([]);
  });

  it("lists the daycares a user can open, for the platform-domain redirect", async () => {
    expect(await listUsableMemberships(db, owner.authProviderId)).toEqual([
      expect.objectContaining({ slug: "mydaycare", name: "My Daycare", role: "DAYCARE_OWNER" }),
    ]);
    expect(await listUsableMemberships(db, "password:nobody")).toEqual([]);
  });
});
