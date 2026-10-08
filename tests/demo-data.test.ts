import { describe, expect, it } from "vitest";
import { demoTenantContext } from "@/lib/demo-data/context";
import { buildDemoSeedEvents, demoOrganization, demoRoster, demoStaff } from "@/lib/demo-data/fixtures";
import { isDemoDataMode } from "@/lib/demo-data/mode";

describe("isDemoDataMode", () => {
  it("forces on/off from DEMO_DATA", () => {
    expect(isDemoDataMode({ DEMO_DATA: "1", D1_GATEWAY_URL: "https://x", D1_GATEWAY_SECRET: "y".repeat(32) })).toBe(true);
    expect(isDemoDataMode({ DEMO_DATA: "0" })).toBe(false);
  });

  it("auto-enables when gateway env is missing", () => {
    expect(isDemoDataMode({})).toBe(true);
    expect(isDemoDataMode({ D1_GATEWAY_URL: "https://gateway.example" })).toBe(true);
    expect(
      isDemoDataMode({ D1_GATEWAY_URL: "https://gateway.example", D1_GATEWAY_SECRET: "s".repeat(32) }),
    ).toBe(false);
  });
});

describe("demo fixtures", () => {
  it("has a usable org, roster, and staff", () => {
    expect(demoOrganization.name.length).toBeGreaterThan(0);
    expect(demoRoster.length).toBeGreaterThanOrEqual(10);
    expect(demoStaff.length).toBeGreaterThanOrEqual(4);
    expect(demoRoster.every((c) => c.guardians.some((g) => g.link.canPickUp))).toBe(true);
  });

  it("builds seed attendance/staff events", () => {
    const { attendance, staffTime } = buildDemoSeedEvents(new Date("2026-10-08T15:00:00Z"));
    expect(attendance.length).toBeGreaterThan(0);
    expect(staffTime.length).toBeGreaterThan(0);
  });

  it("builds a DAYCARE_OWNER tenant context", () => {
    const ctx = demoTenantContext({
      email: "admin@local",
      name: "Admin",
    });
    expect(ctx.role).toBe("DAYCARE_OWNER");
    expect(ctx.organizationId).toBe(demoOrganization.id);
  });
});
