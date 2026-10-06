import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { DatabaseError } from "@/lib/db/executor";
import { AppError, toSafeError } from "@/lib/server/errors";
import { createChildSchema, updateBrandingSchema, updateOrganizationSchema } from "@/lib/validation/mutations";

describe("safe errors", () => {
  it("never exposes SQL, stack traces or credentials", () => {
    const sqlError = new Error(`D1_ERROR: no such column: "secret" in SELECT * FROM users WHERE token = 'abc'`);
    const safe = toSafeError(sqlError);
    expect(safe.code).toBe("INTERNAL");
    expect(safe.message).not.toMatch(/SELECT|users|token|D1_ERROR/);

    const wrapped = new Error("Failed query: select ...", { cause: new DatabaseError("D1 gateway unreachable: fetch failed", "UNAVAILABLE") });
    expect(toSafeError(wrapped)).toMatchObject({ code: "DB_UNAVAILABLE" });
    expect(toSafeError(wrapped).message).not.toMatch(/gateway|fetch|select/i);
  });

  it("keeps user-safe messages and field errors", () => {
    expect(toSafeError(new AppError("ALREADY_CHECKED_IN", "Amari is already checked in."))).toEqual({
      code: "ALREADY_CHECKED_IN",
      message: "Amari is already checked in.",
      fieldErrors: undefined,
    });
    try {
      createChildSchema.parse({ firstName: "", lastName: "X", dateOfBirth: "2023-02-30" });
    } catch (e) {
      expect(e).toBeInstanceOf(ZodError);
      const safe = toSafeError(e);
      expect(safe.code).toBe("VALIDATION");
      expect(Object.keys(safe.fieldErrors ?? {})).toEqual(expect.arrayContaining(["firstName", "dateOfBirth"]));
    }
  });
});

describe("validation", () => {
  const brand = { name: "Little Stars", tagline: "", primaryColor: "#2f6bea", secondaryColor: "#7c4dff", accentColor: "#f28c28", kioskWelcomeMessage: "Hi" };

  it("accepts site paths and https logos only", () => {
    for (const logoUrl of ["", "/tenants/little-stars/logo.svg", "https://cdn.example.com/logo.png"]) {
      expect(updateBrandingSchema.safeParse({ ...brand, logoUrl }).success).toBe(true);
    }
    for (const logoUrl of ["javascript:alert(1)", "http://example.com/logo.png", "//evil.example/logo.png", "data:image/png;base64,AAAA"]) {
      expect(updateBrandingSchema.safeParse({ ...brand, logoUrl }).success).toBe(false);
    }
  });

  it("rejects invalid colors, timezones and currencies", () => {
    expect(updateBrandingSchema.safeParse({ ...brand, primaryColor: "blue" }).success).toBe(false);
    const org = { timezone: "America/Belize", currency: "bzd", expectedArrivalBy: "08:30", receiptPrefix: "LS" };
    expect(updateOrganizationSchema.parse(org).currency).toBe("BZD");
    expect(updateOrganizationSchema.safeParse({ ...org, timezone: "Mars/Olympus" }).success).toBe(false);
    expect(updateOrganizationSchema.safeParse({ ...org, currency: "ZZZ" }).success).toBe(false);
  });

  it("never accepts an organizationId from the client", () => {
    const parsed = createChildSchema.parse({ firstName: "A", lastName: "B", dateOfBirth: "2023-01-01", organizationId: "other-org" });
    expect("organizationId" in parsed).toBe(false);
  });
});
