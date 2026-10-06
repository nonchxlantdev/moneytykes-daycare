import "server-only";

import bcrypt from "bcryptjs";
import { cache } from "react";
import { redirect } from "next/navigation";
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
 */
export interface AuthenticatedIdentity {
  /** Stable external identity. Stored in users.auth_provider_id. */
  authProviderId: string;
  email: string;
  name: string;
}

/** Provider prefix for the current site-password login. A hosted provider would use its own (e.g. "clerk:user_…"). */
const PROVIDER = "password";

export function authProviderIdFor(sessionUserId: string): string {
  return `${PROVIDER}:${sessionUserId}`;
}

/**
 * The only operator who can sign in with the current site-password auth.
 * No password is stored in the database — the bcrypt hash lives in AUTH_PASSWORD_HASH.
 */
function configuredOperator(): { email: string; passwordHash: string; name: string } | null {
  const passwordHash = process.env.AUTH_PASSWORD_HASH?.trim();
  if (!passwordHash || !passwordHash.startsWith("$2")) return null;
  const email = process.env.AUTH_EMAIL?.trim().toLowerCase() || "operator@local";
  const name = process.env.AUTH_USER_NAME?.trim() || "Administrator";
  return { email, passwordHash, name };
}

export function authConfigured(): boolean {
  return configuredOperator() !== null;
}

function identity(account: { email: string; name: string }): AuthenticatedIdentity {
  return { authProviderId: authProviderIdFor(BOOTSTRAP_USER_ID), email: account.email, name: account.name };
}

/** Returns the operator's session user id when the site password matches. */
export async function authenticate(password: string): Promise<{ id: string } | null> {
  const account = configuredOperator();
  if (!account) throw new AuthConfigError();
  const passwordOk = await bcrypt.compare(password, account.passwordHash);
  return passwordOk ? { id: BOOTSTRAP_USER_ID } : null;
}

export const getOptionalIdentity = cache(async (): Promise<AuthenticatedIdentity | null> => {
  const session = await readSession();
  if (!session || session.userId !== BOOTSTRAP_USER_ID) return null;
  const account = configuredOperator();
  return account ? identity(account) : null;
});

/** Server-side gate. Redirects to /login when the session is missing or invalid. */
export const requireIdentity = cache(async (): Promise<AuthenticatedIdentity> => {
  const id = await getOptionalIdentity();
  if (!id) redirect("/login");
  return id;
});
