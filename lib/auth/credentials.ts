import "server-only";

import bcrypt from "bcryptjs";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { OrganizationRole } from "@/types/domain";
import { ORG_ID } from "@/lib/mock-data/organization";
import { BOOTSTRAP_USER_ID } from "./token";
import { readSession } from "./session";

export class AuthConfigError extends Error {
  constructor() {
    super("Authentication is not configured");
    this.name = "AuthConfigError";
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  /** Tenant role for the current demo organization. Membership lookup replaces this. */
  role: OrganizationRole;
  organizationId: string;
}

/**
 * The only user who can sign in before D1 exists.
 * Later this function queries `users` joined to `organization_memberships`.
 */
function configuredUser(): { email: string; passwordHash: string; name: string } | null {
  const passwordHash = process.env.AUTH_PASSWORD_HASH?.trim();
  if (!passwordHash || !passwordHash.startsWith("$2")) return null;
  const email = process.env.AUTH_EMAIL?.trim().toLowerCase() || "operator@local";
  const name = process.env.AUTH_USER_NAME?.trim() || "Administrator";
  return { email, passwordHash, name };
}

export function authConfigured(): boolean {
  return configuredUser() !== null;
}

/** Returns the operator when the site password matches. */
export async function authenticate(password: string): Promise<AuthenticatedUser | null> {
  const account = configuredUser();
  if (!account) throw new AuthConfigError();
  const passwordOk = await bcrypt.compare(password, account.passwordHash);
  if (!passwordOk) return null;
  return {
    id: BOOTSTRAP_USER_ID,
    email: account.email,
    name: account.name,
    role: "ADMIN",
    organizationId: ORG_ID,
  };
}

export const getOptionalUser = cache(async (): Promise<AuthenticatedUser | null> => {
  const session = await readSession();
  if (!session || session.userId !== BOOTSTRAP_USER_ID) return null;
  const account = configuredUser();
  if (!account) return null;
  return {
    id: BOOTSTRAP_USER_ID,
    email: account.email,
    name: account.name,
    role: "ADMIN",
    organizationId: ORG_ID,
  };
});

/** Server-side gate for protected layouts. Redirects when the session is missing or invalid. */
export const getCurrentUser = cache(async (): Promise<AuthenticatedUser> => {
  const user = await getOptionalUser();
  if (!user) redirect("/login");
  return user;
});
