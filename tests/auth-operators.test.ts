import { describe, expect, it } from "vitest";
import {
  AuthUsersParseError,
  findOperator,
  legacyOperatorFromEnv,
  operatorsFromEnv,
  parseAuthUsersJson,
} from "@/lib/auth/operators";

const hashA = "$2b$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ012";
const hashB = "$2b$12$abcdefghijklmnopqrstuuZYXWVUTSRQPONMLKJIHGFEDCBA987";

describe("parseAuthUsersJson", () => {
  it("parses multiple operators", () => {
    const ops = parseAuthUsersJson(
      JSON.stringify([
        { username: "Admin", passwordHash: hashA, name: "Site Admin" },
        { username: "demo", passwordHash: hashB },
      ]),
    );
    expect(ops).toHaveLength(2);
    expect(ops[0]).toMatchObject({ username: "admin", name: "Site Admin", email: "admin@local" });
    expect(ops[1]).toMatchObject({ username: "demo", name: "demo", email: "demo@local" });
  });

  it("rejects invalid JSON and empty arrays", () => {
    expect(() => parseAuthUsersJson("not-json")).toThrow(AuthUsersParseError);
    expect(() => parseAuthUsersJson("[]")).toThrow(AuthUsersParseError);
    expect(() => parseAuthUsersJson(JSON.stringify([{ username: "x" }]))).toThrow(AuthUsersParseError);
  });
});

describe("operatorsFromEnv", () => {
  it("prefers AUTH_USERS over legacy single-user vars", () => {
    const ops = operatorsFromEnv({
      AUTH_USERS: JSON.stringify([{ username: "shamira", passwordHash: hashA, name: "Shamira" }]),
      AUTH_USERNAME: "legacy",
      AUTH_PASSWORD_HASH: hashB,
    });
    expect(ops).toHaveLength(1);
    expect(ops[0].username).toBe("shamira");
  });

  it("falls back to AUTH_USERNAME + AUTH_PASSWORD_HASH", () => {
    const ops = operatorsFromEnv({
      AUTH_USERNAME: "Glen",
      AUTH_PASSWORD_HASH: hashA,
      AUTH_USER_NAME: "Glen R",
      AUTH_EMAIL: "glen@example.com",
    });
    expect(ops).toEqual([
      { username: "glen", passwordHash: hashA, name: "Glen R", email: "glen@example.com" },
    ]);
  });

  it("returns empty when nothing is configured", () => {
    expect(operatorsFromEnv({})).toEqual([]);
    expect(legacyOperatorFromEnv({})).toBeNull();
  });
});

describe("findOperator", () => {
  it("matches usernames case-insensitively", () => {
    const ops = parseAuthUsersJson(JSON.stringify([{ username: "admin", passwordHash: hashA }]));
    expect(findOperator(ops, "ADMIN")?.username).toBe("admin");
    expect(findOperator(ops, "missing")).toBeUndefined();
  });
});
