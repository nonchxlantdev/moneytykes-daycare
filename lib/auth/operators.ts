/**
 * Env-based operator accounts (no DB). Parsed from AUTH_USERS JSON, or the
 * legacy AUTH_USERNAME + AUTH_PASSWORD_HASH pair.
 */

export interface EnvOperator {
  username: string;
  passwordHash: string;
  name: string;
  email: string;
}

function isHash(value: unknown): value is string {
  return typeof value === "string" && value.startsWith("$2");
}

function normalizeOperator(raw: {
  username?: unknown;
  passwordHash?: unknown;
  name?: unknown;
  email?: unknown;
}): EnvOperator | null {
  const username = typeof raw.username === "string" ? raw.username.trim().toLowerCase() : "";
  const passwordHash = typeof raw.passwordHash === "string" ? raw.passwordHash.trim() : "";
  if (!username || !isHash(passwordHash)) return null;
  const name = typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : username;
  const email =
    typeof raw.email === "string" && raw.email.trim()
      ? raw.email.trim().toLowerCase()
      : `${username}@local`;
  return { username, passwordHash, name, email };
}

/** Parse AUTH_USERS JSON. Returns null when unset; throws AuthUsersParseError when invalid. */
export class AuthUsersParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthUsersParseError";
  }
}

export function parseAuthUsersJson(raw: string): EnvOperator[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new AuthUsersParseError("AUTH_USERS is not valid JSON");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new AuthUsersParseError("AUTH_USERS must be a non-empty JSON array");
  }
  const operators: EnvOperator[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") {
      throw new AuthUsersParseError("AUTH_USERS entries must be objects");
    }
    const op = normalizeOperator(item as Record<string, unknown>);
    if (!op) {
      throw new AuthUsersParseError(
        "Each AUTH_USERS entry needs username and a bcrypt passwordHash ($2…)",
      );
    }
    operators.push(op);
  }
  return operators;
}

export function legacyOperatorFromEnv(env: {
  AUTH_USERNAME?: string;
  AUTH_PASSWORD_HASH?: string;
  AUTH_USER_NAME?: string;
  AUTH_EMAIL?: string;
}): EnvOperator | null {
  return normalizeOperator({
    username: env.AUTH_USERNAME,
    passwordHash: env.AUTH_PASSWORD_HASH,
    name: env.AUTH_USER_NAME,
    email: env.AUTH_EMAIL,
  });
}

export type AuthEnv = {
  AUTH_USERS?: string;
  AUTH_USERNAME?: string;
  AUTH_PASSWORD_HASH?: string;
  AUTH_USER_NAME?: string;
  AUTH_EMAIL?: string;
};

/** Prefer AUTH_USERS; fall back to single-user AUTH_USERNAME / AUTH_PASSWORD_HASH. */
export function operatorsFromEnv(env: AuthEnv = process.env as AuthEnv): EnvOperator[] {
  const multi = env.AUTH_USERS?.trim();
  if (multi) return parseAuthUsersJson(multi);
  const legacy = legacyOperatorFromEnv(env);
  return legacy ? [legacy] : [];
}

export function findOperator(operators: EnvOperator[], username: string): EnvOperator | undefined {
  const key = username.trim().toLowerCase();
  return operators.find((o) => o.username === key);
}
