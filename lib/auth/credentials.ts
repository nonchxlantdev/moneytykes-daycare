import "server-only";

import bcrypt from "bcryptjs";
import { cache } from "react";
import { redirect } from "next/navigation";
import { AuthUsersParseError, findOperator, operatorsFromEnv, type EnvOperator } from "./operators";
import { BOOTSTRAP_USER_ID } from "./token";
import { readSession } from "./session";

export class AuthConfigError extends Error {
  constructor() {
    super("Authentication is not configured");
    this.name = "AuthConfigError";
  }
}

/**
 * The authenticated IDENTITY (who signed in). Authorization — which daycare
 * and which role — is resolved separately from the database
 * (users.auth_provider_id → organization_memberships); see lib/auth/tenant.ts.
 *
 * Sign-in itself is env-only: AUTH_USERS (or legacy AUTH_USERNAME +
 * AUTH_PASSWORD_HASH). No user table lookup is required to authenticate.
 */
export interface AuthenticatedIdentity {
  /** Stable external identity. Stored in users.auth_provider_id when a row exists. */
  authProviderId: string;
  email: string;
  name: string;
  username: string;
}

/** Provider prefix for the env username/password login. */
const PROVIDER = "password";

export function authProviderIdFor(sessionUserId: string): string {
  return `${PROVIDER}:${sessionUserId}`;
}

function configuredOperators(): EnvOperator[] {
  try {
    return operatorsFromEnv();
  } catch (error) {
    if (error instanceof AuthUsersParseError) {
      console.error(error.message);
      return [];
    }
    throw error;
  }
}

export function authConfigured(): boolean {
  return configuredOperators().length > 0;
}

function identity(account: EnvOperator): AuthenticatedIdentity {
  return {
    authProviderId: authProviderIdFor(BOOTSTRAP_USER_ID),
    email: account.email,
    name: account.name,
    username: account.username,
  };
}

/**
 * Returns the bootstrap session user id when username and password match an
 * env operator. All env operators share usr_bootstrap for tenancy.
 */
export async function authenticate(
  username: string,
  password: string,
): Promise<{ id: string; username: string } | null> {
  const operators = configuredOperators();
  if (operators.length === 0) throw new AuthConfigError();

  const match = findOperator(operators, username);
  // Always run bcrypt against a real hash so timing does not reveal whether
  // the username existed (use the first configured hash as a dummy).
  const hash = match?.passwordHash ?? operators[0].passwordHash;
  const passwordOk = await bcrypt.compare(password, hash);
  if (!match || !passwordOk) return null;
  return { id: BOOTSTRAP_USER_ID, username: match.username };
}

export const getOptionalIdentity = cache(async (): Promise<AuthenticatedIdentity | null> => {
  const session = await readSession();
  if (!session || session.userId !== BOOTSTRAP_USER_ID) return null;
  const operators = configuredOperators();
  if (operators.length === 0) return null;
  const account = session.username
    ? findOperator(operators, session.username)
    : operators[0];
  return account ? identity(account) : null;
});

/** Server-side gate. Redirects to /login when the session is missing or invalid. */
export const requireIdentity = cache(async (): Promise<AuthenticatedIdentity> => {
  const id = await getOptionalIdentity();
  if (!id) redirect("/login");
  return id;
});
