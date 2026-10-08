import "server-only";

import { cookies, headers } from "next/headers";
import { cookieDomainFor } from "@/lib/tenancy/hostname";
import { decryptSession, encryptSession, SESSION_COOKIE } from "./token";

const HOUR = 60 * 60 * 1000;
const SESSION_HOURS = 12;
const REMEMBER_DAYS = 30;

/** Short-lived flag so /login can play the welcome animation once after sign-in. */
export const WELCOME_COOKIE = "vf_welcome";

/**
 * Cookie scope:
 *   - On visionforgestudio.app and its subdomains the cookie is set for the
 *     parent domain (AUTH_COOKIE_DOMAIN), so signing in on the platform domain
 *     also signs you in on mydaycare.visionforgestudio.app. Access to each
 *     daycare is still decided by membership on every request.
 *   - Everywhere else (localhost, *.workers.dev, *.vercel.app) it is host-only.
 * Always HttpOnly, SameSite=Lax, and Secure in production.
 */
async function cookieDomain(): Promise<string | undefined> {
  return cookieDomainFor((await headers()).get("host"), process.env.AUTH_COOKIE_DOMAIN);
}

const baseOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
});

export async function readSession(): Promise<{ userId: string; username?: string } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return decryptSession(token);
}

export async function createSession(userId: string, remember: boolean, username?: string): Promise<void> {
  const maxAgeMs = remember ? REMEMBER_DAYS * 24 * HOUR : SESSION_HOURS * HOUR;
  const expiresAt = new Date(Date.now() + maxAgeMs);
  const token = await encryptSession(userId, expiresAt, username);
  const domain = await cookieDomain();
  (await cookies()).set(SESSION_COOKIE, token, { ...baseOptions(), expires: expiresAt, ...(domain ? { domain } : {}) });
}

/** Mark this sign-in so the next /login render can show the welcome animation. */
export async function markWelcomePending(): Promise<void> {
  const domain = await cookieDomain();
  (await cookies()).set(WELCOME_COOKIE, "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60,
    ...(domain ? { domain } : {}),
  });
}

/** Read-only — safe in Server Components. Clear via clearWelcomePending() in an action. */
export async function peekWelcomePending(): Promise<boolean> {
  return (await cookies()).get(WELCOME_COOKIE)?.value === "1";
}

export async function clearWelcomePending(): Promise<void> {
  const cookieStore = await cookies();
  const domain = await cookieDomain();
  const expired = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  };
  if (domain) cookieStore.set(WELCOME_COOKIE, "", { ...expired, domain });
  else cookieStore.set(WELCOME_COOKIE, "", expired);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  const domain = await cookieDomain();
  const expired = { ...baseOptions(), expires: new Date(0), maxAge: 0 };
  // Clear the parent-domain cookie and any host-only cookie from before the domain was configured.
  if (domain) {
    cookieStore.set(SESSION_COOKIE, "", { ...expired, domain });
    cookieStore.set(WELCOME_COOKIE, "", { ...expired, domain });
  } else {
    cookieStore.set(SESSION_COOKIE, "", expired);
    cookieStore.set(WELCOME_COOKIE, "", expired);
  }
}
