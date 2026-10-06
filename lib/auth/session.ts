import "server-only";

import { cookies } from "next/headers";
import { decryptSession, encryptSession, SESSION_COOKIE } from "./token";

const HOUR = 60 * 60 * 1000;
const SESSION_HOURS = 12;
const REMEMBER_DAYS = 30;

export async function readSession(): Promise<{ userId: string } | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return decryptSession(token);
}

export async function createSession(userId: string, remember: boolean): Promise<void> {
  const maxAgeMs = remember ? REMEMBER_DAYS * 24 * HOUR : SESSION_HOURS * HOUR;
  const expiresAt = new Date(Date.now() + maxAgeMs);
  const token = await encryptSession(userId, expiresAt);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: expiresAt,
    path: "/",
  });
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    expires: new Date(0),
    path: "/",
    maxAge: 0,
  });
}
